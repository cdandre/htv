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

    // Get deal with all related data including documents
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        *,
        company:companies(*),
        deal_analyses(*),
        documents(*)
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

    // Get document contents if available
    let documentContext = ''
    if (deal.documents && deal.documents.length > 0) {
      documentContext = `\n\nUPLOADED DOCUMENTS:\n`
      for (const doc of deal.documents) {
        documentContext += `- ${doc.title} (${doc.mime_type})\n`
        // If we had document content stored, we would include it here
        // For now, we note that documents exist
      }
      documentContext += `\nIMPORTANT: The above documents contain critical information about the company. Base your analysis primarily on these documents, then supplement with web research.\n`
    }

    // Generate memo using OpenAI Responses API
    const memoPrompt = `You are a senior venture capital partner at HTV writing a comprehensive investment memo for the investment committee. Your memo should be thorough, data-driven, and balanced.

CRITICAL INSTRUCTIONS:
1. The AI ANALYSIS provided above is based on uploaded documents - use it as your PRIMARY source
2. Extract key insights from the analysis (team assessment, market analysis, product evaluation, etc.)
3. Use web search to SUPPLEMENT with current market data, competitor updates, and recent news
4. Perform 10-15 focused web searches for additional context
5. Clearly distinguish between insights from the document analysis and web research

COMPANY TO ANALYZE: ${deal.company.name}
Deal Title: ${deal.title}
Stage: ${deal.stage}
Check Size Range: $${deal.check_size_min ? (deal.check_size_min/1000000).toFixed(1) : '?'}M - $${deal.check_size_max ? (deal.check_size_max/1000000).toFixed(1) : '?'}M
Website: ${deal.company.website || 'Not provided'}
Location: ${deal.company.location || 'Not provided'}${documentContext}

CRITICAL: You are analyzing "${deal.company.name}" - make sure all web searches are about THIS specific company, not similarly named companies.

Based on the following AI analysis (which includes insights from uploaded documents), write a comprehensive investment memo.

IMPORTANT: The analysis below was generated from uploaded documents about the company. Use this as your PRIMARY source of information, then SUPPLEMENT with web searches for:
- Latest news about ${deal.company.name}
- Recent competitor funding rounds and acquisitions
- Current market size data and growth rates
- Industry reports and analyst forecasts
- Regulatory updates in the sector
- Comparable company valuations and exits
- Team member backgrounds and previous ventures
- Customer testimonials and case studies
- Technology trends affecting the market

DOCUMENT-BASED ANALYSIS (from uploaded files about ${deal.company.name}):
${JSON.stringify(latestAnalysis.result, null, 2)}

The above analysis was generated from documents uploaded about ${deal.company.name}. This is your PRIMARY source of company information.

REQUIRED WEB SEARCHES:
1. Company verification: Search "${deal.company.name}" with their website "${deal.company.website || 'unknown'}" to ensure you have the right company
2. Recent news: "${deal.company.name} news 2024 2025"
3. Funding history: "${deal.company.name} funding rounds investment"
4. Team backgrounds: Search for founder names from the analysis
5. Market research: "[industry from analysis] market size growth rate 2024"
6. Competitors: "${deal.company.name} competitors" AND "[industry] startups"
7. HTV thesis fit: "HTV ventures portfolio" and "venture capital ${deal.stage} investments real estate tech"
8. Industry reports: "[industry] venture capital investment trends 2024"

For each web search result you use, include it as a markdown link in your text: [fact or quote](URL)

Write a comprehensive memo (2,500-3,000 words) following this EXACT structure. Be concise but thorough. If approaching length limits, prioritize quality over completeness:

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
### Strategic Fit with HTV
RESEARCH REQUIRED: Search for "HTV ventures portfolio" and "HTV ventures investment thesis" to understand their focus areas. Analyze how this deal aligns with HTV's:
- Portfolio composition and sector focus
- Stage preferences (${deal.stage} deals)
- Check size sweet spot
- Geographic focus
- Value-add capabilities

### Why We Should Invest
- Alignment with HTV's investment mandate (based on your research)
- Market timing and opportunity size
- Team's ability to execute in this market
- Potential for venture-scale returns (10x+)
- Competitive advantages and moats

### Value-Add Opportunities
- How HTV's expertise can accelerate growth
- Potential synergies with portfolio companies
- Network connections and customer introductions
- Strategic guidance based on HTV's experience

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

CITATION REQUIREMENTS:
- When using information from web search, ALWAYS cite it inline as: [text](url)
- Example: "The market is growing at [15% annually](https://example.com/report)"
- Include 10-15 web citations throughout the memo
- Clearly indicate when information comes from uploaded documents vs web search
- Every market statistic, competitor mention, or external data point needs a citation

REMEMBER:
- Base company details on the uploaded document analysis
- Use web search to verify, update, and supplement with market context
- Assess thesis fit by researching HTV's portfolio and investment focus
- Make a clear recommendation based on both document insights and market research`

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
        }],
        max_output_tokens: 8000  // Increase output limit to prevent truncation
      }),
    })

    console.log('OpenAI Responses API called with web_search tool')
    console.log('Request model:', 'gpt-4.1')
    console.log('Max output tokens:', 8000)

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      throw new Error(error.error?.message || 'Failed to generate memo')
    }

    const response = await openaiResponse.json()
    console.log('OpenAI response structure:', JSON.stringify(response, null, 2).substring(0, 500))

    // Extract memo text and citations from Responses API output
    let memoText = ''
    let webSources: any[] = []
    
    // Log to understand response structure better
    console.log('Response output type:', typeof response.output)
    console.log('Response keys:', Object.keys(response))
    
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
    
    // Also check for web search results at the top level
    if (response.web_search_results) {
      webSources = webSources.concat(response.web_search_results)
    }
    
    console.log('Found web sources count:', webSources.length)
    console.log('Web sources sample:', webSources.slice(0, 2))
    
    if (!memoText) {
      console.error('No memo content in response:', JSON.stringify(response, null, 2))
      throw new Error('Failed to generate memo content')
    }
    // Process citations - create a map of sources
    const sourcesMap = new Map<string, any>()
    let citationIndex = 1
    
    // First, extract URLs from markdown links in the text
    const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
    let match
    while ((match = markdownLinkPattern.exec(memoText)) !== null) {
      const linkText = match[1]
      const url = match[2]
      if (!sourcesMap.has(url)) {
        sourcesMap.set(url, {
          index: citationIndex++,
          title: linkText,
          url: url,
          snippet: ''
        })
      }
    }
    
    // Then process any web sources from the API response
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
    
    console.log('Total sources found:', sourcesMap.size)
    console.log('Sources:', Array.from(sourcesMap.values()).map(s => ({ index: s.index, url: s.url })))
    
    // Add inline citations to the memo text
    let citedMemoText = memoText
    if (sourcesMap.size > 0) {
      // Replace URLs in text with citation numbers
      for (const [url, source] of sourcesMap) {
        const citation = `[${source.index}]`
        
        // Replace markdown link format [text](url) with text [citation]
        const markdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegExp(url)}\\)`, 'g')
        citedMemoText = citedMemoText.replace(markdownLinkRegex, `$1 ${citation}`)
        
        // Replace bare URLs in parentheses (url) with [citation]
        const bareUrlRegex = new RegExp(`\\(${escapeRegExp(url)}\\)`, 'g')
        citedMemoText = citedMemoText.replace(bareUrlRegex, citation)
        
        // Replace any remaining bare URLs with [citation]
        const plainUrlRegex = new RegExp(`(?<!\\[)${escapeRegExp(url)}(?!\\])`, 'g')
        citedMemoText = citedMemoText.replace(plainUrlRegex, citation)
      }
      
      // Fix any malformed citations like ([domain][number]) to just [number]
      citedMemoText = citedMemoText.replace(/\(\[[^\]]+\]\[(\d+)\]\)/g, '[$1]')
      citedMemoText = citedMemoText.replace(/\[[^\]]+\]\[(\d+)\]/g, '[$1]')
      // Fix citations like (domain [number]) to just [number]
      citedMemoText = citedMemoText.replace(/\([^\)]+\s\[(\d+)\]\)/g, '[$1]')
      // Fix citations like (domain[number]) to just [number]
      citedMemoText = citedMemoText.replace(/\([^\)]+\[(\d+)\]\)/g, '[$1]')
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