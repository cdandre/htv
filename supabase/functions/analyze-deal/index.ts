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

    // Create analysis with OpenAI Responses API
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: `
You are an expert venture capital analyst evaluating a potential investment opportunity.

Company: ${deal.company.name}
Deal: ${deal.title}

Based on the following documents, provide a comprehensive investment analysis:

${documentContent}

Provide your analysis in the following structured format:

## Executive Summary
[1-2 paragraph overview of the opportunity]

## Team Assessment (Score: X/10)
- Founder backgrounds and experience
- Team completeness and gaps
- Advisory board strength

## Market Opportunity (Score: X/10)
- TAM/SAM/SOM analysis
- Market growth trends
- Timing assessment

## Product & Technology (Score: X/10)
- Product differentiation
- Technical moat
- Development stage

## Business Model (Score: X/10)
- Revenue model clarity
- Unit economics
- Scalability potential

## Competitive Analysis
- Direct competitors
- Competitive advantages
- Market positioning

## Traction & Validation (Score: X/10)
- Customer validation
- Revenue/user metrics
- Growth trajectory

## Risk Assessment
- Key risks identified
- Mitigation strategies
- Red flags

## Financial Analysis
- Burn rate and runway
- Revenue projections
- Funding requirements

## Investment Recommendation
- Overall score: X/10
- Recommended action: [Pass/Further Diligence/Invest]
- Suggested check size: $X
- Key conditions or milestones

Provide specific evidence from the documents to support each assessment. Be critical but fair.
        `,
        instructions: 'Analyze this deal like a top-tier VC partner would. Be thorough, data-driven, and highlight both opportunities and risks.',
        tools: [
          {
            type: 'web_search'
          }
        ],
        store: true,
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      throw new Error(error.error?.message || 'Failed to create analysis')
    }

    const response = await openaiResponse.json()

    // Store the analysis using service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    const { data: analysis, error: analysisError } = await supabaseService
      .from('deal_analyses')
      .insert({
        deal_id: dealId,
        response_id: response.id,
        analysis_type: 'comprehensive',
        status: 'completed',
        result: {
          content: response.output[0].content[0].text,
          created_at: response.created_at,
          model: response.model,
        },
        token_usage: response.usage,
        requested_by: user.id,
      })
      .select()
      .single()

    if (analysisError) {
      throw analysisError
    }

    // Extract scores from the analysis to update deal
    const analysisText = response.output[0].content[0].text
    const scoreMatches = analysisText.match(/Score:\s*(\d+)\/10/g)
    if (scoreMatches && scoreMatches.length >= 5) {
      const scores = scoreMatches.map((match: string) => 
        parseInt(match.match(/\d+/)![0])
      )
      
      await supabaseService
        .from('deals')
        .update({
          team_score: scores[0],
          market_score: scores[1],
          product_score: scores[2],
          thesis_fit_score: scores[3],
        })
        .eq('id', dealId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysisId: analysis.id,
        responseId: response.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error analyzing deal:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to analyze deal' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})