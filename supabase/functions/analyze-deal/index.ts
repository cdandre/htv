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
        output_schema: {
          type: 'object',
          properties: {
            executive_summary: {
              type: 'string',
              description: 'High-level overview of the investment opportunity'
            },
            scores: {
              type: 'object',
              properties: {
                team: { type: 'number', minimum: 0, maximum: 10 },
                market: { type: 'number', minimum: 0, maximum: 10 },
                product: { type: 'number', minimum: 0, maximum: 10 },
                thesis_fit: { type: 'number', minimum: 0, maximum: 10 }
              },
              required: ['team', 'market', 'product', 'thesis_fit']
            },
            team_assessment: {
              type: 'object',
              properties: {
                strengths: { type: 'array', items: { type: 'string' } },
                concerns: { type: 'array', items: { type: 'string' } },
                background_verification: { type: 'string' }
              }
            },
            market_analysis: {
              type: 'object',
              properties: {
                size: { type: 'string' },
                growth_rate: { type: 'string' },
                trends: { type: 'array', items: { type: 'string' } },
                competitors: { type: 'array', items: { type: 'string' } }
              }
            },
            product_evaluation: {
              type: 'object',
              properties: {
                differentiation: { type: 'string' },
                technical_assessment: { type: 'string' },
                customer_validation: { type: 'string' }
              }
            },
            financial_projections: {
              type: 'object',
              properties: {
                revenue_model: { type: 'string' },
                burn_rate: { type: 'string' },
                runway: { type: 'string' },
                key_metrics: { type: 'array', items: { type: 'string' } }
              }
            },
            investment_recommendation: {
              type: 'object',
              properties: {
                decision: { type: 'string', enum: ['pass', 'explore', 'invest'] },
                rationale: { type: 'string' },
                next_steps: { type: 'array', items: { type: 'string' } }
              }
            },
            risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  description: { type: 'string' },
                  mitigation: { type: 'string' }
                }
              }
            }
          },
          required: ['executive_summary', 'scores', 'team_assessment', 'market_analysis', 'product_evaluation', 'investment_recommendation']
        },
        input: `You are an expert venture capital analyst evaluating a potential investment opportunity.

Company: ${deal.company.name}
Deal: ${deal.title}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}
Location: ${deal.company.location || 'Unknown'}

Based on the following documents and your web research, provide a comprehensive investment analysis:

${documentContent}

IMPORTANT: Use web search actively to:
1. Research the company's latest news, funding history, and team backgrounds
2. Find current market size data and growth projections for their sector
3. Identify and analyze key competitors and their recent funding/traction
4. Verify claims made in the pitch deck with external sources
5. Look up founder/executive backgrounds on LinkedIn, Crunchbase, etc.

Provide a comprehensive analysis with structured data including:
- Executive summary with key findings
- Numerical scores (0-10) for team, market, product, and thesis fit
- Detailed team assessment with strengths, concerns, and background verification
- Market analysis with size, growth rate, trends, and competitors
- Product evaluation covering differentiation and validation
- Financial projections and metrics
- Key risks and mitigation strategies
- Comparable exits in the space

Provide specific evidence from both the documents AND web research to support each assessment. Cite external sources when used. Be critical but fair.`,
        instructions: 'Analyze this deal like a top-tier VC partner would. Use web search extensively to validate claims and gather market intelligence. Be thorough, data-driven, and highlight both opportunities and risks.',
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
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
    
    // Extract structured data
    const structuredAnalysis = response.output[0].content[0].text
    let analysisData
    try {
      analysisData = JSON.parse(structuredAnalysis)
    } catch (e) {
      // Fallback if not JSON
      analysisData = { content: structuredAnalysis }
    }

    const { data: analysis, error: analysisError } = await supabaseService
      .from('deal_analyses')
      .insert({
        deal_id: dealId,
        response_id: response.id,
        analysis_type: 'comprehensive',
        status: 'completed',
        result: {
          ...analysisData,
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

    // Update deal scores if structured output is available
    if (analysisData.scores) {
      await supabaseService
        .from('deals')
        .update({
          team_score: analysisData.scores.team,
          market_score: analysisData.scores.market,
          product_score: analysisData.scores.product,
          thesis_fit_score: analysisData.scores.thesis_fit,
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