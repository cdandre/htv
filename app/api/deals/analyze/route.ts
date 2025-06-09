import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { dealId } = await request.json()
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
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
    const response = await openai.beta.responses.create({
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
          type: 'web_search',
          web_search: {
            max_results: 5
          }
        }
      ],
      store: true,
    })

    // Store the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('deal_analyses')
      .insert({
        deal_id: dealId,
        response_id: response.id,
        analysis_type: 'comprehensive',
        status: 'completed',
        result: {
          content: response.output,
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
    const scoreMatches = response.output.match(/Score:\s*(\d+)\/10/g)
    if (scoreMatches && scoreMatches.length >= 5) {
      const scores = scoreMatches.map(match => 
        parseInt(match.match(/\d+/)![0])
      )
      
      await supabase
        .from('deals')
        .update({
          team_score: scores[0],
          market_score: scores[1],
          product_score: scores[2],
          thesis_fit_score: scores[3],
        })
        .eq('id', dealId)
    }

    return NextResponse.json({ 
      success: true, 
      analysisId: analysis.id,
      responseId: response.id 
    })
  } catch (error: any) {
    console.error('Error analyzing deal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze deal' },
      { status: 500 }
    )
  }
}