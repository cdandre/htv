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
      throw new Error('Deal not found')
    }

    // Get the latest analysis
    const latestAnalysis = deal.deal_analyses
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!latestAnalysis) {
      throw new Error('No analysis found for this deal')
    }

    // Generate memo using OpenAI Responses API
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: `You are a senior venture capital partner writing an investment memo for the partnership.

Company: ${deal.company.name}
Deal: ${deal.title}
Stage: ${deal.stage}
Check Size: $${deal.check_size_min}-${deal.check_size_max}
Website: ${deal.company.website || 'Not provided'}
Sector: ${deal.sector || 'Unknown'}

Based on the following analysis, write a professional investment memo. Use web search to find the most recent information about market conditions, competitor updates, and regulatory changes since the analysis was completed.

${latestAnalysis.result.content}

IMPORTANT: Use web search to:
1. Find the latest news about the company or sector (last 30 days)
2. Check for any recent competitor funding rounds or exits
3. Verify current market conditions and any macro changes
4. Look for recent regulatory updates affecting the sector
5. Find comparable company valuations and exit multiples

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

Write in a professional, data-driven tone. Use specific numbers and examples from the analysis. Be balanced - highlight both opportunities and risks. Include citations for any external data from web search.
        `,
        instructions: 'Write like a seasoned VC partner. Be concise but thorough. Use data to support arguments. Actively use web search to ensure the memo reflects the most current market conditions.',
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
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

    // Store the memo using service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    const { data: memo, error: memoError } = await supabaseService
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        memoId: memo.id,
        responseId: response.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error generating memo:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate memo' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : error.message === 'No analysis found for this deal' ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

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