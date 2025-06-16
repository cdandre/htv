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
    let vectorStoreId = null
    
    if (deal.documents.length > 0) {
      // Create a vector store for this deal's documents
      try {
        console.log('Creating vector store for deal documents...')
        const vectorStoreResponse = await fetch('https://api.openai.com/v1/vector_stores', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Deal ${dealId} - ${deal.company.name} Analysis`
          })
        })
        
        if (vectorStoreResponse.ok) {
          const vectorStore = await vectorStoreResponse.json()
          vectorStoreId = vectorStore.id
          console.log('Created vector store:', vectorStoreId)
        } else {
          console.error('Failed to create vector store:', await vectorStoreResponse.text())
        }
      } catch (error) {
        console.error('Error creating vector store:', error)
      }
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
          
          // Store the OpenAI file ID in the database
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
          
          const { error: updateError } = await supabaseService
            .from('documents')
            .update({ openai_file_id: file.id })
            .eq('id', doc.id)
          
          if (updateError) {
            console.error(`Failed to store OpenAI file ID for ${doc.title}:`, updateError)
          } else {
            console.log(`Stored OpenAI file ID for ${doc.title}`)
          }
          
          // Add file to vector store if we have one
          if (vectorStoreId) {
            try {
              const addFileResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  file_id: file.id
                })
              })
              
              if (addFileResponse.ok) {
                console.log(`Added ${doc.title} to vector store`)
              } else {
                console.error(`Failed to add file to vector store:`, await addFileResponse.text())
              }
            } catch (error) {
              console.error(`Error adding file to vector store:`, error)
            }
          }
        } catch (error) {
          console.error(`Error uploading ${doc.title}:`, error)
        }
      }
    }

    // Build the prompt for Responses API
    let analysisPrompt = `Analyze this investment opportunity:

Company: ${deal.company.name}
Deal: ${deal.title}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}
Location: ${deal.company.location || 'Unknown'}

${uploadedFiles.length > 0 ? `I have uploaded ${uploadedFiles.length} document(s) for your analysis. Please analyze them thoroughly.` : 'No documents were provided.'}

IMPORTANT: You MUST use the file_search tool to analyze the uploaded documents. Search for company information, funding details, team information, and market data within the documents.

Please analyze all provided information and documents thoroughly. Extract specific details from the documents, particularly from pitch decks and investment memos. If you cannot find specific information in the documents, you may use null for that field, but you MUST provide scores between 1-10 based on your analysis.

Provide a comprehensive investment analysis as a JSON object with the following structure. For company_details and deal_details, extract actual values from the documents - do not use null if the information exists in the documents:`
    
    // Add the JSON structure to the prompt
    analysisPrompt += `
{
  "executive_summary": "High-level overview of the investment opportunity",
  "company_details": {
    "name": "Official company name from documents",
    "website": "Company website URL",
    "location": "Company headquarters location",
    "founded_date": "YYYY-MM-DD or null if not found",
    "description": "Company description/mission",
    "linkedin_url": "Company LinkedIn URL if found",
    "crunchbase_url": "Company Crunchbase URL if found",
    "sector": "Primary sector/industry"
  },
  "deal_details": {
    "round_size": "Total funding round size in dollars (number only)",
    "valuation": "Pre-money or post-money valuation in dollars (number only)",
    "check_size_min": "Minimum investment amount requested from HTV (number only)",
    "check_size_max": "Maximum investment amount available to HTV (number only)",
    "stage": "Funding stage (pre-seed, seed, series-a, etc.)"
  },
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

    // Use the Responses API as required
    try {
      console.log('Creating analysis with OpenAI Responses API...')
      
      // Build the request body for Responses API with file_search
      const requestBody: any = {
        model: 'gpt-4.1',
        input: analysisPrompt,
        text: {
          format: {
            type: 'json_object'
          }
        },
        temperature: 0.7
      }
      
      // Add tools configuration if we have a vector store
      if (vectorStoreId) {
        requestBody.tools = [
          {
            type: 'file_search',
            vector_store_ids: [vectorStoreId]
          }
        ]
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
        let outputText = ''
        
        // The response has multiple outputs - file_search_call and message
        // We need the message output which contains the analysis
        if (response.output && Array.isArray(response.output)) {
          // Log file_search activity
          const fileSearchOutput = response.output.find(o => o.type === 'file_search_call')
          if (fileSearchOutput) {
            console.log('File search performed:', {
              status: fileSearchOutput.status,
              queries: fileSearchOutput.queries?.length || 0
            })
          } else {
            console.warn('No file_search_call found in response - documents may not have been analyzed')
          }
          
          for (const output of response.output) {
            if (output.type === 'message' && output.content && Array.isArray(output.content)) {
              for (const content of output.content) {
                if (content.type === 'output_text' && content.text) {
                  outputText = content.text
                  break
                }
              }
              if (outputText) break
            }
          }
        }
        
        if (!outputText) {
          console.error('No output text found in response')
          console.error('Response structure:', JSON.stringify(response, null, 2))
          throw new Error('No analysis content in response')
        }
        
        // Parse the JSON from the response
        analysisData = JSON.parse(outputText)
        console.log('Parsed analysis data successfully')
        console.log('Company details extracted:', analysisData.company_details)
        console.log('Deal details extracted:', analysisData.deal_details)
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
        openai_vector_store_id: vectorStoreId
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Database error storing analysis:', analysisError)
      throw new Error(`Failed to store analysis: ${analysisError.message}`)
    }

    // Update deal scores and details
    // Ensure scores are valid (between 1-10, default to 5 if invalid)
    const dealUpdateData: any = {
      thesis_fit_score: (analysisData.scores.thesis_fit >= 1 && analysisData.scores.thesis_fit <= 10) 
        ? analysisData.scores.thesis_fit 
        : 5,
      market_score: (analysisData.scores.market >= 1 && analysisData.scores.market <= 10) 
        ? analysisData.scores.market 
        : 5,
      team_score: (analysisData.scores.team >= 1 && analysisData.scores.team <= 10) 
        ? analysisData.scores.team 
        : 5,
      product_score: (analysisData.scores.product >= 1 && analysisData.scores.product <= 10) 
        ? analysisData.scores.product 
        : 5,
    }
    
    // Add deal details if extracted
    if (analysisData.deal_details) {
      if (analysisData.deal_details.round_size) {
        dealUpdateData.round_size = parseFloat(analysisData.deal_details.round_size)
      }
      if (analysisData.deal_details.valuation) {
        dealUpdateData.valuation = parseFloat(analysisData.deal_details.valuation)
      }
      if (analysisData.deal_details.check_size_min) {
        dealUpdateData.check_size_min = parseFloat(analysisData.deal_details.check_size_min)
      }
      if (analysisData.deal_details.check_size_max) {
        dealUpdateData.check_size_max = parseFloat(analysisData.deal_details.check_size_max)
      }
    }
    
    const { error: updateError } = await supabaseService
      .from('deals')
      .update(dealUpdateData)
      .eq('id', dealId)

    if (updateError) {
      console.error('Failed to update deal scores:', updateError)
    }
    
    // Update company details if extracted
    if (analysisData.company_details && deal.company_id) {
      const companyUpdateData: any = {}
      
      if (analysisData.company_details.name && analysisData.company_details.name !== deal.company.name) {
        companyUpdateData.name = analysisData.company_details.name
      }
      if (analysisData.company_details.website) {
        // Ensure website has a protocol
        let website = analysisData.company_details.website.trim()
        if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
          website = `https://${website}`
        }
        companyUpdateData.website = website
      }
      if (analysisData.company_details.location) {
        companyUpdateData.location = analysisData.company_details.location
      }
      if (analysisData.company_details.founded_date) {
        companyUpdateData.founded_date = analysisData.company_details.founded_date
      }
      if (analysisData.company_details.description) {
        companyUpdateData.description = analysisData.company_details.description
      }
      if (analysisData.company_details.linkedin_url) {
        companyUpdateData.linkedin_url = analysisData.company_details.linkedin_url
      }
      if (analysisData.company_details.crunchbase_url) {
        companyUpdateData.crunchbase_url = analysisData.company_details.crunchbase_url
      }
      
      if (Object.keys(companyUpdateData).length > 0) {
        const { error: companyUpdateError } = await supabaseService
          .from('companies')
          .update(companyUpdateData)
          .eq('id', deal.company_id)
        
        if (companyUpdateError) {
          console.error('Failed to update company details:', companyUpdateError)
        } else {
          console.log('Updated company details with extracted information')
        }
      }
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