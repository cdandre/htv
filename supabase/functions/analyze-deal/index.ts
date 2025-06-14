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

    // Upload documents to OpenAI using direct API calls
    console.log('Number of documents:', deal.documents.length)
    const uploadedFiles = []
    
    if (deal.documents.length > 0) {
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
          
          // Create multipart form data for file upload
          const boundary = '----FormBoundary' + Math.random().toString(36)
          const arrayBuffer = await fileData.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)
          
          // Build multipart body
          const parts = [
            `------${boundary}`,
            `Content-Disposition: form-data; name="purpose"`,
            '',
            'assistants',
            `------${boundary}`,
            `Content-Disposition: form-data; name="file"; filename="${doc.title}"`,
            `Content-Type: ${doc.mime_type}`,
            '',
          ]
          
          // Combine parts with file data
          const textParts = parts.join('\r\n') + '\r\n'
          const endPart = `\r\n------${boundary}--\r\n`
          
          const textEncoder = new TextEncoder()
          const body = new Uint8Array(
            textEncoder.encode(textParts).length + 
            uint8Array.length + 
            textEncoder.encode(endPart).length
          )
          
          let offset = 0
          const textPartBytes = textEncoder.encode(textParts)
          body.set(textPartBytes, offset)
          offset += textPartBytes.length
          
          body.set(uint8Array, offset)
          offset += uint8Array.length
          
          const endPartBytes = textEncoder.encode(endPart)
          body.set(endPartBytes, offset)
          
          // Upload to OpenAI
          console.log(`Uploading ${doc.title} to OpenAI...`)
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': `multipart/form-data; boundary=----${boundary}`
            },
            body: body
          })
          
          if (!uploadResponse.ok) {
            const error = await uploadResponse.text()
            console.error(`Failed to upload ${doc.title}:`, error)
            continue
          }
          
          const file = await uploadResponse.json()
          uploadedFiles.push({
            fileId: file.id,
            filename: doc.title,
            type: doc.mime_type
          })
          
          console.log(`Successfully uploaded ${doc.title} with ID: ${file.id}`)
        } catch (error) {
          console.error(`Error uploading ${doc.title}:`, error)
        }
      }
    }

    // Build the input for Responses API
    const inputContent = []
    
    // Add text prompt
    inputContent.push({
      type: 'input_text',
      text: `Analyze this investment opportunity:

Company: ${deal.company.name}
Deal: ${deal.title}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}
Location: ${deal.company.location || 'Unknown'}

${uploadedFiles.length > 0 ? `I have uploaded ${uploadedFiles.length} document(s) for your analysis.` : 'No documents were provided.'}

Please analyze all provided information and documents thoroughly.

Provide a comprehensive investment analysis as a JSON object with the following structure:`
    })
    
    // Add uploaded files to the input
    for (const file of uploadedFiles) {
      inputContent.push({
        type: 'input_file',
        file_id: file.fileId
      })
    }
    
    // Add the JSON structure to the text prompt
    inputContent[0].text += `
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

    // Use direct API call for Responses API
    try {
      console.log('Creating analysis with OpenAI Responses API...')
      
      const requestBody = {
        model: 'gpt-4.1',
        input: [{
          role: 'user',
          content: inputContent
        }]
      }
      
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text()
        console.error('OpenAI API error:', error)
        throw new Error('Failed to create analysis')
      }
      
      const response = await apiResponse.json()
      console.log('OpenAI response received')
    
      // Extract the structured analysis from the Responses API output
      let analysisData
      try {
        // The SDK response has output_text property
        const outputText = response.output_text || ''
        
        if (!outputText) {
          console.error('No output text found in response')
          throw new Error('No analysis content in response')
        }
        
        // Parse the JSON from the response
        analysisData = JSON.parse(outputText)
        console.log('Parsed analysis data successfully')
      } catch (e) {
        console.error('Failed to parse analysis response:', e)
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
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError)
      throw new Error(openaiError.message || 'Failed to create analysis')
    }
  } catch (error: any) {
    console.error('Error in analyze-deal function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})