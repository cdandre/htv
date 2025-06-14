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
    const memoPrompt = `You are a senior venture capital partner at HTV writing a comprehensive investment memo for the investment committee. Your memo should be thorough, data-driven, and balanced.

Company: ${deal.company.name}
Deal: ${deal.title}
Stage: ${deal.stage}
Check Size Range: $${deal.check_size_min ? (deal.check_size_min/1000000).toFixed(1) : '?'}M - $${deal.check_size_max ? (deal.check_size_max/1000000).toFixed(1) : '?'}M
Website: ${deal.company.website || 'Not provided'}
Location: ${deal.company.location || 'Not provided'}

Based on the following AI analysis, write a comprehensive investment memo. Use web search to find the most recent information about market conditions, competitor updates, regulatory changes, and comparable transactions.

ANALYSIS DATA:
${JSON.stringify(latestAnalysis.result, null, 2)}

IMPORTANT: Use web search extensively to:
1. Find the latest news about the company (last 30-60 days)
2. Research recent competitor funding rounds, acquisitions, or product launches
3. Analyze current market conditions and macro trends affecting the sector
4. Identify recent regulatory changes or upcoming regulations
5. Find comparable company valuations, exits, and multiples
6. Research the backgrounds of key team members
7. Validate market size claims with recent analyst reports

Write a comprehensive memo (~3,000 words) following this EXACT structure with the sections clearly defined:

# Investment Memo: ${deal.company.name}

## Executive Summary
Write 2-3 paragraphs that include:
- Company overview and what they do
- Investment opportunity and proposed terms
- Key investment highlights (3-4 bullet points)
- Investment recommendation with rationale
- Expected returns and exit timeline

## Company Overview
Provide a detailed description including:
- Company mission and vision
- Founding story and key milestones
- Core products/services offered
- Target customers and use cases
- Current stage and achievements to date

## Team Assessment
### Founding Team
- Detailed backgrounds of founders (education, previous companies, achievements)
- Relevant domain expertise and track record
- Complementary skills and gaps in the team
- References and reputation in the industry

### Key Employees and Advisors
- Notable hires and their backgrounds
- Advisory board composition and value-add
- Team culture and hiring plans

## Problem & Solution
### Problem Statement
- Detailed description of the problem being solved
- Why this problem matters and who it affects
- Current solutions and their shortcomings
- Market pain points and customer frustrations

### Solution
- How the product/service solves the problem
- Unique approach and key innovations
- Technical moat and defensibility
- Product roadmap and future vision

## Market Opportunity
### Market Size & Segmentation
- TAM (Total Addressable Market) with calculations
- SAM (Serviceable Addressable Market) with rationale
- SOM (Serviceable Obtainable Market) realistic targets
- Market segmentation and initial target segments

### Market Dynamics & Trends
- Industry growth rates and drivers
- Key market trends supporting the opportunity
- Regulatory environment and changes
- Technology shifts enabling the business

## Product & Technology
### Current Product
- Detailed product description and features
- Technology stack and architecture
- Intellectual property and patents
- Product-market fit evidence

### Product Development
- Development roadmap for next 12-24 months
- R&D investments and priorities
- Technical challenges and solutions
- Platform expansion opportunities

## Business Model
### Revenue Model
- How the company makes money
- Pricing strategy and rationale
- Average contract values and deal sizes
- Recurring vs. one-time revenue mix

### Unit Economics
- Customer acquisition cost (CAC)
- Lifetime value (LTV) and LTV/CAC ratio
- Gross margins and contribution margins
- Path to profitability

### Go-to-Market Strategy
- Sales and marketing approach
- Customer acquisition channels
- Sales cycle and conversion rates
- Partnership and channel strategies

## Traction & Metrics
### Current Performance
- Revenue and growth rates (MoM, YoY)
- Customer count and notable logos
- Key operational metrics
- Cohort retention and engagement data

### Validation & Proof Points
- Customer testimonials and case studies
- Pilot results and ROI demonstrated
- Awards and recognition
- Third-party validation

## Competitive Analysis
### Competitive Landscape
- Direct competitors with detailed comparison
- Indirect competitors and substitutes
- Competitive positioning matrix
- Market share analysis

### Competitive Advantages
- Sustainable competitive moats
- Differentiation factors
- Switching costs and lock-in effects
- Network effects and scale advantages

## Financial Analysis
### Historical Financials
- Revenue history and growth
- Burn rate and cash position
- Key expense categories
- Working capital requirements

### Financial Projections
- 3-5 year revenue projections with assumptions
- Path to breakeven and profitability
- Scenario analysis (base, upside, downside)
- Key metrics and milestones

### Use of Funds
- Detailed allocation of raise
- Expected impact of investment
- Hiring plans and headcount growth
- Timeline for deployment

## Investment Thesis
### Why We Should Invest
- Strategic fit with HTV's thesis
- Market timing considerations
- Team capability to execute
- Potential for venture-scale returns

### Value-Add Opportunities
- How HTV can help beyond capital
- Relevant portfolio company synergies
- Network connections and introductions
- Strategic guidance areas

## Risks & Mitigation
### Key Risks
For each major risk category:
1. Market Risk - [Description and mitigation strategy]
2. Execution Risk - [Description and mitigation strategy]
3. Technology Risk - [Description and mitigation strategy]
4. Competitive Risk - [Description and mitigation strategy]
5. Regulatory Risk - [Description and mitigation strategy]
6. Financial Risk - [Description and mitigation strategy]

## Exit Strategy
### Exit Scenarios
- Strategic acquirer analysis
- IPO potential and timeline
- Comparable exits and valuations
- Expected exit multiples and returns

### Return Analysis
- Multiple scenarios with probabilities
- Expected return profile
- Portfolio impact analysis

## Recommendation
### Investment Decision
- Clear invest/pass recommendation
- Rationale for the decision
- Any conditions or requirements
- Follow-up diligence items

### Proposed Terms
- Investment amount: $X
- Pre-money valuation: $X
- Post-money ownership: X%
- Board representation: [Yes/No]
- Key terms and protections
- Co-investors and allocation

## Next Steps
- Immediate action items with owners
- Diligence requirements
- Timeline for decision
- Key milestones to track post-investment

---

Remember to:
- Use specific data and numbers throughout
- Cite sources for market data and claims using markdown links format: [text](url)
- Include ALL web sources you use as inline citations
- Balance optimism with realistic assessment
- Address concerns proactively
- Write in clear, professional language
- Make a definitive recommendation
- When citing facts or data from web search, ALWAYS include the source URL`

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: memoPrompt,
        tools: [{
          type: 'web_search'
        }]
      }),
    })

    console.log('OpenAI Responses API called with web_search tool')

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      throw new Error(error.error?.message || 'Failed to generate memo')
    }

    const response = await openaiResponse.json()
    console.log('OpenAI response structure:', JSON.stringify(response, null, 2).substring(0, 500))

    // Extract memo text and citations from Responses API output
    let memoText = ''
    let webSources: any[] = []
    
    // Extract web search results if included
    if (response.output && Array.isArray(response.output)) {
      for (const item of response.output) {
        // Extract text content
        if (item.content && Array.isArray(item.content)) {
          for (const content of item.content) {
            if (content.text) {
              memoText += content.text
            }
            // Extract annotations/citations
            if (content.annotations) {
              webSources = webSources.concat(content.annotations)
            }
          }
        }
        // Extract web search results if available
        if (item.type === 'web_search_call' && item.results) {
          webSources = webSources.concat(item.results)
        }
      }
    } else if (response.output_text) {
      // Handle direct output_text format
      memoText = response.output_text
    }
    
    if (!memoText) {
      console.error('No memo content in response:', JSON.stringify(response, null, 2))
      throw new Error('Failed to generate memo content')
    }
    // Process citations - create a map of sources
    const sourcesMap = new Map<string, any>()
    let citationIndex = 1
    
    // Process web sources and assign citation numbers
    for (const source of webSources) {
      const url = source.url || source.link
      if (url && !sourcesMap.has(url)) {
        sourcesMap.set(url, {
          index: citationIndex++,
          title: source.title || source.snippet || 'Web Source',
          url: url,
          snippet: source.snippet || source.description || ''
        })
      }
    }
    
    // Add inline citations to the memo text
    let citedMemoText = memoText
    if (sourcesMap.size > 0) {
      // Replace URLs in text with citation numbers
      for (const [url, source] of sourcesMap) {
        const citation = `[${source.index}]`
        // Replace various URL patterns with citations
        citedMemoText = citedMemoText.replace(
          new RegExp(`\\(${escapeRegExp(url)}\\)`, 'g'),
          citation
        )
        citedMemoText = citedMemoText.replace(
          new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegExp(url)}\\)`, 'g'),
          `$1 ${citation}`
        )
      }
    }
    
    const parsedSections = parseMemoSections(citedMemoText)
    const memoContent = {
      raw: citedMemoText,
      ...parsedSections,
      sources: Array.from(sourcesMap.values()).sort((a, b) => a.index - b.index),
      metadata: {
        company_name: deal.company.name,
        deal_stage: deal.stage,
        check_size_range: `$${deal.check_size_min ? (deal.check_size_min/1000000).toFixed(1) : '?'}M-$${deal.check_size_max ? (deal.check_size_max/1000000).toFixed(1) : '?'}M`,
        generated_at: new Date().toISOString(),
        sources_count: sourcesMap.size
      }
    }

    // Store the memo using service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    const { data: memo, error: memoError } = await supabaseService
      .from('investment_memos')
      .insert({
        deal_id: dealId,
        title: `Investment Memo - ${deal.company.name}`,
        content: memoContent,
        status: 'completed',
        token_usage: response.usage || {},
        created_by: user.id,
        version: 1,
      })
      .select()
      .single()

    if (memoError) {
      console.error('Database error storing memo:', memoError)
      throw new Error(`Failed to store memo: ${memoError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        memoId: memo.id
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
  let currentSubsection = ''
  let currentContent: string[] = []
  
  // Map section headers to standardized keys
  const sectionKeyMap: Record<string, string> = {
    'Executive Summary': 'executive_summary',
    'Company Overview': 'company_overview',
    'Team Assessment': 'team_assessment',
    'Problem & Solution': 'problem_solution',
    'Market Opportunity': 'market_opportunity',
    'Product & Technology': 'product_technology',
    'Business Model': 'business_model',
    'Traction & Metrics': 'traction_metrics',
    'Competitive Analysis': 'competitive_analysis',
    'Financial Analysis': 'financial_analysis',
    'Investment Thesis': 'investment_thesis',
    'Risks & Mitigation': 'risks_mitigation',
    'Exit Strategy': 'exit_strategy',
    'Recommendation': 'recommendation',
    'Next Steps': 'next_steps',
    'Use of Funds': 'use_of_funds',
    'Proposed Terms': 'proposed_terms'
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section if exists
      if (currentSection) {
        const key = sectionKeyMap[currentSection] || currentSection.toLowerCase().replace(/\s+/g, '_')
        sections[key] = currentContent.join('\n').trim()
      }
      currentSection = line.substring(3).trim()
      currentSubsection = ''
      currentContent = []
    } else if (line.startsWith('### ')) {
      // Handle subsections - append to current content
      if (currentSubsection) {
        currentContent.push('')  // Add spacing between subsections
      }
      currentSubsection = line.substring(4).trim()
      currentContent.push(line)
    } else if (line.startsWith('# ')) {
      sections['title'] = line.substring(2).trim()
    } else {
      currentContent.push(line)
    }
  }

  // Save the last section
  if (currentSection) {
    const key = sectionKeyMap[currentSection] || currentSection.toLowerCase().replace(/\s+/g, '_')
    sections[key] = currentContent.join('\n').trim()
  }

  return sections
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}