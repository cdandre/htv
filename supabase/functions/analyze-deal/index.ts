import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dealId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get deal details with documents
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        company:companies(*),
        documents(*)
      `)
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      throw new Error('Deal not found')
    }

    // Upload documents to OpenAI for file search
    console.log('Number of documents:', deal.documents.length)
    
    let vectorStoreId = null
    let fileIds = []
    
    if (deal.documents.length > 0) {
      try {
        // Create a vector store for this deal's documents
        const vectorStoreResponse = await fetch('https://api.openai.com/v1/vector_stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            name: `deal-${dealId}-documents`
          })
        })
        
        if (!vectorStoreResponse.ok) {
          throw new Error(`Failed to create vector store: ${vectorStoreResponse.statusText}`)
        }
        
        const vectorStore = await vectorStoreResponse.json()
        vectorStoreId = vectorStore.id
        console.log('Created vector store:', vectorStoreId)
        
        // Upload each document to OpenAI
        for (const doc of deal.documents) {
          try {
            // Download file from Supabase storage
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('documents')
              .download(doc.file_path)
            
            if (downloadError) {
              console.error(`Failed to download ${doc.title}:`, downloadError)
              continue
            }
            
            // Create form data for file upload
            const formData = new FormData()
            formData.append('file', fileData, doc.title)
            formData.append('purpose', 'assistants')
            
            // Upload to OpenAI
            const fileResponse = await fetch('https://api.openai.com/v1/files', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
              },
              body: formData
            })
            
            if (!fileResponse.ok) {
              console.error(`Failed to upload ${doc.title}:`, await fileResponse.text())
              continue
            }
            
            const uploadedFile = await fileResponse.json()
            fileIds.push(uploadedFile.id)
            
            // Add file to vector store
            const attachResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                file_id: uploadedFile.id
              })
            })
            
            if (!attachResponse.ok) {
              console.error(`Failed to attach ${doc.title} to vector store:`, await attachResponse.text())
            }
            
            console.log(`Uploaded ${doc.title} with file ID: ${uploadedFile.id}`)
          } catch (error) {
            console.error(`Error processing ${doc.title}:`, error)
          }
        }
        
        console.log(`Uploaded ${fileIds.length} files to vector store`)
        
      } catch (error) {
        console.error('Error setting up vector store:', error)
      }
    }

    // Create analysis with OpenAI Responses API
    const analysisPrompt = `Analyze this investment opportunity:

Company: ${deal.company.name}
Deal: ${deal.title}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}
Location: ${deal.company.location || 'Unknown'}

${vectorStoreId ? 'Please analyze the uploaded documents and provide insights based on their content.' : 'No documents were provided for analysis.'}

Provide a comprehensive investment analysis as a JSON object with the following structure:
{
  "executive_summary": "High-level overview of the investment opportunity",
  "scores": {
    "team": <0-10>,
    "market": <0-10>,
    "product": <0-10>,
    "thesis_fit": <0-10>
  },
  "team_assessment": {
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1", "concern2"],
    "background_verification": "Background verification findings"
  },
  "market_analysis": {
    "size": "Market size estimate",
    "growth_rate": "Growth rate",
    "trends": ["trend1", "trend2"],
    "competitors": ["competitor1", "competitor2"]
  },
  "product_evaluation": {
    "differentiation": "Key differentiators",
    "technical_assessment": "Technical assessment",
    "customer_validation": "Customer validation status"
  },
  "financial_projections": {
    "revenue_model": "Revenue model description",
    "burn_rate": "Monthly burn rate",
    "runway": "Runway in months",
    "key_metrics": ["metric1", "metric2"]
  },
  "investment_recommendation": {
    "decision": "pass" | "explore" | "invest",
    "rationale": "Detailed rationale for the decision",
    "next_steps": ["step1", "step2"]
  },
  "risks": [
    {
      "category": "Risk category",
      "description": "Risk description",
      "mitigation": "Mitigation strategy"
    }
  ]
}`

    // Build the request body
    const requestBody: any = {
      model: 'gpt-4.1',
      input: analysisPrompt,
    }
    
    // Add file search tool if we have documents
    if (vectorStoreId) {
      requestBody.tools = [{
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }]
    }
    
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      console.error('OpenAI API error:', error)
      throw new Error(error.error?.message || 'Failed to create analysis')
    }

    const response = await openaiResponse.json()
    
    // Extract the structured analysis from the Responses API output
    let analysisData
    try {
      // The Responses API returns output in a different format
      let outputText = ''
      if (response.output && Array.isArray(response.output)) {
        // Handle array output format
        for (const item of response.output) {
          if (item.content && Array.isArray(item.content)) {
            for (const content of item.content) {
              if (content.text) {
                outputText += content.text
              }
            }
          }
        }
      } else if (response.output_text) {
        // Handle direct output_text format
        outputText = response.output_text
      }
      
      if (!outputText) {
        console.error('No output text found in response:', JSON.stringify(response, null, 2))
        throw new Error('No analysis content in response')
      }
      
      analysisData = JSON.parse(outputText)
      console.log('Parsed analysis data:', JSON.stringify(analysisData, null, 2))
    } catch (e) {
      console.error('Failed to parse analysis response:', e)
      console.error('Raw response:', JSON.stringify(response, null, 2))
      throw new Error('Invalid analysis format received')
    }

    // Store the analysis using service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create deal analysis record
    const { data: analysis, error: analysisError } = await supabaseService
      .from('deal_analyses')
      .insert({
        deal_id: dealId,
        analysis_type: 'comprehensive',
        status: 'completed',
        result: analysisData,
        requested_by: user.id,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Database error storing analysis:', analysisError)
      throw new Error(`Failed to store analysis: ${analysisError.message}`)
    }

    // Update deal scores
    const { error: updateError } = await supabaseService
      .from('deals')
      .update({
        thesis_fit_score: analysisData.scores.thesis_fit,
        market_score: analysisData.scores.market,
        team_score: analysisData.scores.team,
        product_score: analysisData.scores.product,
      })
      .eq('id', dealId)

    if (updateError) {
      console.error('Failed to update deal scores:', updateError)
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in analyze-deal function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})