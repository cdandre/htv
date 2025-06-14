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

    // Get all document chunks for this deal
    const documentIds = deal.documents.map((d: any) => d.id)
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .order('document_id', { ascending: true })
      .order('chunk_index', { ascending: true })

    // Concatenate all document content
    const documentContent = chunks
      ?.map(chunk => chunk.content)
      .join('\n\n') || ''

    // Create analysis with OpenAI API using Responses API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [{
          role: 'system',
          content: `You are an expert venture capital analyst evaluating potential investment opportunities. 
          Provide thorough, data-driven analysis with numerical scores and structured insights.
          Always provide scores as numbers between 0-10.`
        }, {
          role: 'user',
          content: `Analyze this investment opportunity:

Company: ${deal.company.name}
Deal: ${deal.title}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}
Location: ${deal.company.location || 'Unknown'}

Documents provided:
${documentContent || 'No documents available'}

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
        }],
        response_format: {
          type: 'json_object'
        },
        temperature: 0.7,
        max_tokens: 4000
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      console.error('OpenAI API error:', error)
      throw new Error(error.error?.message || 'Failed to create analysis')
    }

    const response = await openaiResponse.json()
    
    // Extract the structured analysis from the response
    let analysisData
    try {
      analysisData = JSON.parse(response.choices[0].message.content)
      console.log('Parsed analysis data:', JSON.stringify(analysisData, null, 2))
    } catch (e) {
      console.error('Failed to parse analysis response:', e)
      console.error('Raw response:', response.choices[0].message.content)
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