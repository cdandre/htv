import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { dealId } = await request.json()
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get deal with all related data
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        company:companies(*),
        deal_analyses(*)
      `)
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Get the latest analysis
    const latestAnalysis = deal.deal_analyses
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!latestAnalysis) {
      return NextResponse.json({ error: 'No analysis found for this deal' }, { status: 400 })
    }

    // Generate memo using OpenAI Responses API
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
      model: 'gpt-4.1',
      input: `
You are a senior venture capital partner writing an investment memo for the partnership.

Company: ${deal.company.name}
Deal: ${deal.title}
Stage: ${deal.stage}
Check Size: $${deal.check_size_min}-${deal.check_size_max}

Based on the following analysis, write a professional investment memo:

${latestAnalysis.result.content}

The memo should follow this exact structure:

# Investment Memo: ${deal.company.name}

## Executive Summary
[2-3 paragraphs summarizing the opportunity, our thesis, and recommendation]

## Company Overview
### Business Description
[What the company does, target market, value proposition]

### Founding Team
[Backgrounds, relevant experience, strengths/weaknesses]

### Product & Technology
[Core product, technical differentiation, development stage]

## Market Opportunity
### Market Size & Growth
[TAM/SAM/SOM analysis with specific numbers and sources]

### Market Dynamics
[Key trends, timing, why now]

### Competition
[Competitive landscape, positioning, defensibility]

## Business Model & Traction
### Revenue Model
[How they make money, pricing, unit economics]

### Current Traction
[Key metrics, customer validation, growth rate]

### Go-to-Market Strategy
[Customer acquisition, sales process, channels]

## Investment Thesis
### Why We're Excited
[3-4 bullet points on key strengths]

### Key Risks & Mitigation
[3-4 major risks and how they're addressed]

### Value Add
[How HTV can specifically help this company]

## Financial Analysis
### Current Financials
[Burn rate, runway, revenue if any]

### Use of Funds
[What they'll do with the money]

### Expected Returns
[Potential exit scenarios and multiples]

## Deal Terms
- Round Size: $X
- Pre-money Valuation: $X
- Our Check: $X
- Ownership: X%
- Lead/Follow: [Lead/Follow]
- Other Investors: [List]

## Recommendation
[Clear recommendation with rationale and any conditions]

## Next Steps
[Specific action items and timeline]

Write in a professional, data-driven tone. Use specific numbers and examples from the analysis. Be balanced - highlight both opportunities and risks.
      `,
      instructions: 'Write like a seasoned VC partner. Be concise but thorough. Use data to support arguments.',
      previous_response_id: latestAnalysis.response_id,
        store: true,
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      throw new Error(error.error?.message || 'Failed to generate memo')
    }

    const response = await openaiResponse.json()

    // Create memo content structure
    const memoText = response.output[0].content[0].text
    const memoContent = {
      raw: memoText,
      sections: parseMemoSections(memoText),
      metadata: {
        company_name: deal.company.name,
        deal_stage: deal.stage,
        check_size_range: `$${deal.check_size_min}-${deal.check_size_max}`,
        generated_at: new Date().toISOString(),
      }
    }

    // Store the memo
    const { data: memo, error: memoError } = await supabase
      .from('investment_memos')
      .insert({
        deal_id: dealId,
        response_id: response.id,
        title: `Investment Memo - ${deal.company.name}`,
        content: memoContent,
        status: 'completed',
        token_usage: response.usage,
        created_by: user.id,
        version: 1,
      })
      .select()
      .single()

    if (memoError) {
      throw memoError
    }

    return NextResponse.json({ 
      success: true, 
      memoId: memo.id,
      responseId: response.id 
    })
  } catch (error: any) {
    console.error('Error generating memo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate memo' },
      { status: 500 }
    )
  }
}

function parseMemoSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = content.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim()
      }
      currentSection = line.substring(3).trim()
      currentContent = []
    } else if (line.startsWith('# ')) {
      sections['title'] = line.substring(2).trim()
    } else {
      currentContent.push(line)
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim()
  }

  return sections
}