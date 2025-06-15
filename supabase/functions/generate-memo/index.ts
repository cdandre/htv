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
    
    // Extract company information from the analysis
    const analysisResult = latestAnalysis.result || {}
    
    // Search for website/domain in various possible locations in the analysis
    let extractedWebsite = ''
    
    // Check common fields
    extractedWebsite = analysisResult.company_website || 
                      analysisResult.website || 
                      analysisResult.domain ||
                      analysisResult.company_info?.website ||
                      analysisResult.company_info?.domain ||
                      analysisResult.company_overview?.website ||
                      analysisResult.executive_summary?.match(/(?:website|domain):\s*([^\s,]+\.(?:com|ai|io|co|net|org))/i)?.[1] ||
                      ''
    
    // Convert analysis to text for searching
    const analysisText = JSON.stringify(analysisResult)
    
    // If not found, search in the full analysis text for domain patterns
    if (!extractedWebsite) {
      // First try to find domains that match the company name
      const companyNameLower = deal.company.name.toLowerCase().replace(/\s+/g, '')
      const domainPattern = new RegExp(`(${companyNameLower}\\.[a-zA-Z]{2,6})`, 'i')
      const companyDomainMatch = analysisText.match(domainPattern)
      
      if (companyDomainMatch) {
        extractedWebsite = companyDomainMatch[1]
        console.log('Found domain matching company name:', extractedWebsite)
      } else {
        // Fallback to any domain pattern, but prefer .ai domains for AI companies
        const allDomains = analysisText.match(/([a-zA-Z0-9-]+\.(?:ai|com|io|co|net|org))(?=[^a-zA-Z0-9-]|$)/g) || []
        
        // Filter out common domains that are not the company
        const filteredDomains = allDomains.filter(d => 
          !['example.com', 'gmail.com', 'linkedin.com', 'twitter.com'].includes(d.toLowerCase())
        )
        
        // Prefer .ai domains for tech companies
        const aiDomain = filteredDomains.find(d => d.endsWith('.ai'))
        if (aiDomain) {
          extractedWebsite = aiDomain
          console.log('Found .ai domain:', extractedWebsite)
        } else if (filteredDomains.length > 0) {
          extractedWebsite = filteredDomains[0]
          console.log('Found domain:', extractedWebsite)
        }
      }
    }
    
    // Use extracted website if available, otherwise fall back to database
    const companyWebsite = extractedWebsite || deal.company.website || ''
    const companyDomain = companyWebsite.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    
    console.log('=== COMPANY IDENTIFICATION ===')
    console.log('Company Name:', deal.company.name)
    console.log('Website from DB:', deal.company.website || 'Not in database')
    console.log('Website from Document Analysis:', extractedWebsite || 'Not found in analysis')
    console.log('Final Website Used:', companyWebsite || 'None')
    console.log('Domain for Searches:', companyDomain || 'None')
    console.log('Analysis contains domain info:', analysisText.includes('.ai') ? 'Yes (.ai domain found)' : analysisText.includes('.com') ? 'Yes (.com domain found)' : 'No domain found')
    console.log('===========================')

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
    const memoPrompt = `You are a senior venture capital partner at Home Technology Ventures (HTV), a specialized VC fund focused exclusively on transforming the housing and home industries.

HTV INVESTMENT THESIS & FOCUS:
- Mission: Partner with founders changing how we build, transact, finance, maintain, improve, and consume homes
- Stage: Series A and Series B investments
- Focus Areas:
  • Homebuilding - Tech to address the 6M home shortage
  • Mortgage & Finance - Increasing housing attainability
  • Real Estate Brokerage - Digital transformation
  • Insurance - Home insurance innovation
  • Property Management - Tech solutions
  • Home Services - Digital platforms for maintenance
  • Home Improvement - Tech-enabled renovation
  • Home Health - Housing/healthcare intersection
- Founded by Christopher Langford (ex-Lowe's Ventures)
- Portfolio: Key (co-ownership), Nestment (co-buying), Moved (moving concierge), etc.

Your task is to analyze ${deal.company.name} and assess fit with HTV's housing/home tech thesis.

⚠️ CRITICAL: If the company is NOT in housing/home/real estate/construction tech, clearly state this upfront and explain why it's outside HTV's investment mandate.

DOCUMENT-BASED COMPANY INFORMATION (YOUR PRIMARY SOURCE):
Based on the uploaded pitch deck and documents, here are the VERIFIED FACTS about the company:
- Company Name: ${deal.company.name}
- Company Domain: ${companyDomain || 'Not found - search for the correct domain'}
- Stage: ${deal.stage}
- Documents uploaded: ${deal.documents?.length || 0} files

${companyDomain ? `
⚠️ CRITICAL DOMAIN VERIFICATION:
- The company domain is ${companyDomain} (verified from uploaded documents)
- DO NOT confuse with similar domains (e.g., adbuy.com vs adbuy.ai are DIFFERENT companies)
- ALWAYS include "${companyDomain}" in your searches about THIS company
` : '⚠️ Domain not found in documents - you must search to find the correct company website'}

DOCUMENT ANALYSIS (extracted from uploaded pitch deck):
${JSON.stringify(latestAnalysis.result, null, 2)}

${documentContext}

STEP 1 - DEEP DIVE INTO UPLOADED DOCUMENTS:
The document analysis above contains key insights from the pitch deck. Search through it for:
- Company's value proposition for housing/home industry
- Evidence of solving real problems for homeowners, builders, or real estate professionals
- Team backgrounds - look for housing/construction/real estate experience
- Customer traction - any homebuilders, brokers, property managers as customers?
- Business model - B2B selling to housing industry or B2B2C through housing partners?
- Market size claims - how big is their segment of the housing market?
- Technology differentiation - what's unique about their approach?
- Financial metrics - revenue, burn rate, runway from the deck

IMPORTANT: Quote specific facts and figures from the document analysis when writing the memo.

STEP 2 - PERFORM WEB SEARCHES TO VERIFY AND SUPPLEMENT:
Now perform web searches to supplement the document insights:
1. Search: "${deal.company.name} ${companyDomain} company overview"
2. Search: "${deal.company.name} ${companyDomain} funding history"  
3. Search: "${deal.company.name} ${companyDomain} team founders"
4. Search: "${companyDomain} website about team product"
5. Search: "${deal.company.name} competitors" (then verify they compete with ${companyDomain})
6. Search: "${deal.company.name} real estate proptech housing"
7. Search: "proptech ${deal.stage} investments 2024 2025"
8. Search: "${deal.company.name} homebuilders brokers property managers customers"

CRITICAL WEB SEARCH REQUIREMENTS:
- Base your understanding on the DOCUMENT ANALYSIS first
- Use web search to UPDATE and SUPPLEMENT document insights
- ALWAYS include ${companyDomain} in searches about the company
- Verify you're researching the RIGHT company (${deal.company.name} at ${companyDomain})

CRITICAL INSTRUCTIONS:
1. The AI ANALYSIS provided above is based on uploaded documents - use it as your PRIMARY source
2. Extract key insights from the analysis (team assessment, market analysis, product evaluation, etc.)
3. ACTIVELY USE web_search to find 15-20 additional sources for market data, competitors, and news
4. EVERY fact from web search MUST have an inline citation in markdown format
5. Clearly distinguish between insights from the document analysis and web research

COMPANY TO ANALYZE: ${deal.company.name}
Deal Title: ${deal.title}
Stage: ${deal.stage}
Check Size Range: $${deal.check_size_min ? (deal.check_size_min/1000000).toFixed(1) : '?'}M - $${deal.check_size_max ? (deal.check_size_max/1000000).toFixed(1) : '?'}M
Website/Domain: ${companyWebsite || 'Not provided'} ${companyDomain ? `(${companyDomain})` : ''}
Location: ${deal.company.location || 'Not provided'}${documentContext}

CRITICAL: You are analyzing "${deal.company.name}" ${companyDomain ? `with domain ${companyDomain}` : ''}
- If the company has a specific domain (like adbuy.ai vs adbuy.com), make sure ALL searches include the correct domain
- Search for "${deal.company.name} ${companyDomain}" to ensure you find the right company
- DO NOT research similarly named companies with different domains

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

REQUIRED WEB SEARCHES - YOU MUST PERFORM ALL OF THESE:
1. Company verification: "${deal.company.name} ${companyDomain}" to ensure you have the RIGHT company
2. Company website check: "site:${companyDomain}" or "${companyDomain} about team"
3. Recent news: "${deal.company.name} ${companyDomain} news 2024 2025"
4. Funding history: "${deal.company.name} ${companyDomain} funding investment"
5. Team backgrounds: Search for specific founder names from the analysis with company domain
6. Market research: Extract the specific industry/market from the analysis and search for size/growth
7. Competitors: "${deal.company.name} ${companyDomain} competitors" 
8. HTV portfolio fit: "HTV ventures portfolio proptech real estate" and "HTV ventures ${deal.stage}"
9. Industry analysis: "[specific industry from analysis] venture capital trends 2024"
10. Market size: "[industry] market size 2024 2025 forecast"
11. Customer reviews: "${deal.company.name} ${companyDomain} customer reviews testimonials"
12. Technology stack: "${deal.company.name} ${companyDomain} technology platform architecture"
13. Partnership news: "${deal.company.name} ${companyDomain} partnerships integrations"
14. Regulatory landscape: "[industry] regulations compliance 2024"
15. Exit comparables: "[industry] acquisitions IPO exits 2023 2024"

WARNING: Many companies have similar names. ALWAYS verify you're researching ${deal.company.name} with domain ${companyDomain}, not a different company!

WEB SEARCH ENFORCEMENT:
- If you do not use web_search_preview at least 15 times, the memo will be automatically rejected
- Start each major section by performing relevant web searches
- Use specific search queries with company name and domain
- The system will handle citation formatting automatically

Write a focused investment memo (1,500-2,000 words) following this structure. Be concise and direct:

# Investment Memo: ${deal.company.name}

## Executive Summary
- Company overview and HTV thesis fit
- Investment recommendation (invest/pass)
- Key highlights (3 bullet points)
- Proposed terms: Check size and valuation

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
Evaluate how this deal aligns with HTV's housing/home tech focus:
- Which HTV focus area does this fit? (Homebuilding, Mortgage/Finance, Real Estate, Insurance, Property Mgmt, Home Services, Home Improvement, Home Health)
- Does it address the housing shortage or improve housing attainability?
- Is this a Series A/B opportunity (HTV's sweet spot)?
- Does the team have domain expertise in housing/construction/real estate?
- Can HTV's Lowe's heritage and industry connections add value?

### Why We Should Invest
- Clear alignment with HTV's mission to transform housing/home industries
- Solving a significant problem in the residential ecosystem
- Large addressable market within housing (worth $30T+ in US)
- Strong founder-market fit with housing industry experience
- Potential to leverage HTV's network (homebuilders, Lowe's, other portfolio cos)
- Venture-scale opportunity (10x+ potential) in housing transformation

### Value-Add Opportunities
- Introductions to major homebuilders and real estate companies
- Leverage Christopher Langford's housing industry expertise
- Potential pilot opportunities with Lowe's ecosystem
- Synergies with HTV portfolio (Key, Nestment, Moved, etc.)
- Strategic guidance on navigating housing industry dynamics
- Access to HTV's network of proptech investors and advisors

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
- Clear invest/pass recommendation based on HTV thesis fit
- Does this transform how we build, transact, finance, maintain, or improve homes?
- Is the team capable of navigating the complex housing industry?
- Can HTV's expertise and network meaningfully accelerate this company?
- Key concerns or conditions for investment

### Proposed Terms
- Investment amount: $X (typical HTV Series A/B range)
- Pre-money valuation: $X
- Post-money ownership: X%
- Board representation: [Christopher Langford or designee]
- Key terms: Pro-rata rights, information rights, board observer
- Strategic value-add: Lowe's pilot, homebuilder intros, proptech network

## Next Steps
- Immediate action items with owners
- Diligence requirements
- Timeline for decision
- Key milestones to track post-investment

---

CITATION REQUIREMENTS:
- When using ANY information from web search, you MUST cite it inline using markdown links
- Format: [exact text or fact](full URL)
- Examples:
  - "The market is valued at [$2.5 billion](https://example.com/market-report)"
  - "According to [TechCrunch](https://techcrunch.com/article), the company raised $10M"
  - "AdBuy operates in the [$400B digital advertising market](https://statista.com/stats)"
- EVERY fact from web search needs a citation - no exceptions
- Include 10-15 citations minimum throughout the memo
- When citing the company's own website, use the full URL with domain

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
          type: 'web_search_preview',
          search_context_size: 'medium'  // Balance quality and cost
        }],
        tool_choice: { type: 'web_search_preview' },  // Force web search usage
        store: true,  // Store for conversation continuity
        max_output_tokens: 4096  // Standard limit for better reliability
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
    
    // Log the full response for debugging
    console.log('=== FULL OPENAI RESPONSE ===')
    console.log(JSON.stringify(response, null, 2))
    console.log('=== END RESPONSE ===')

    // Extract memo text and citations from Responses API output
    let memoText = ''
    let webSources: any[] = []
    
    // Log to understand response structure better
    console.log('Response output type:', typeof response.output)
    console.log('Response keys:', Object.keys(response))
    
    // The Responses API should return an output field
    if (response.output) {
      // If output is a string, use it directly
      if (typeof response.output === 'string') {
        memoText = response.output
        console.log('Output is direct string')
      }
      // If output is an array (structured format)
      else if (Array.isArray(response.output)) {
        console.log('Output is array with length:', response.output.length)
        for (const item of response.output) {
          console.log('Processing output item:', JSON.stringify(item, null, 2).substring(0, 500))
          
          // Handle message type output (standard Responses API format)
          if (item.type === 'message' && item.content) {
            console.log('Found message type output')
            if (Array.isArray(item.content)) {
              for (const content of item.content) {
                if (content.type === 'output_text' && content.text) {
                  memoText += content.text
                  console.log('Added message content text, length:', content.text.length)
                }
              }
            }
          }
          
          // Handle direct text output
          if (item.type === 'output_text' && item.text) {
            memoText += item.text
            console.log('Added direct text output, length:', item.text.length)
          }
          
          // Handle content array format (alternative structure)
          if (item.content && Array.isArray(item.content)) {
            for (const content of item.content) {
              if (content.type === 'output_text' && content.text) {
                memoText += content.text
                console.log('Added content array text, length:', content.text.length)
              }
            }
          }
          
          // Extract web search call (per documentation, this just contains the ID)
          if (item.type === 'web_search_call') {
            console.log('Found web_search_call item:', item)
            // This item just contains the ID and status, actual citations are in message annotations
          }
          
          // Extract annotations from message content (this is where citations are)
          if (item.type === 'message' && item.content) {
            console.log('Processing message content for annotations')
            if (Array.isArray(item.content)) {
              for (const content of item.content) {
                if (content.type === 'output_text' && content.annotations) {
                  console.log('Found annotations:', content.annotations.length)
                  // Extract URL citations from annotations
                  for (const annotation of content.annotations) {
                    if (annotation.type === 'url_citation') {
                      webSources.push({
                        url: annotation.url,
                        title: annotation.title,
                        start_index: annotation.start_index,
                        end_index: annotation.end_index
                      })
                      console.log('Added URL citation:', annotation.url)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Also check for direct output_text (as shown in documentation examples)
    if (!memoText && response.output_text) {
      memoText = response.output_text
      console.log('Using direct output_text format')
    }
    
    // Also check for web search results at the top level
    if (response.web_search_results) {
      webSources = webSources.concat(response.web_search_results)
    }
    
    console.log('Final memo text length:', memoText.length)
    console.log('First 1000 chars of memo:', memoText.substring(0, 1000))
    console.log('Last 500 chars of memo:', memoText.substring(memoText.length - 500))
    console.log('Found web sources count:', webSources.length)
    console.log('Web sources sample:', webSources.slice(0, 2))
    
    if (!memoText) {
      console.error('No memo content in response')
      throw new Error('Failed to generate memo content')
    }
    
    // Check if memo seems truncated
    if (memoText.length > 0 && !memoText.includes('## Recommendation')) {
      console.warn('WARNING: Memo appears truncated - missing Recommendation section')
    }
    // Process citations - create a map of sources
    const sourcesMap = new Map<string, any>()
    let citationIndex = 1
    
    // First, extract URLs from markdown links in the text
    const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
    const foundLinks: string[] = []
    let match
    while ((match = markdownLinkPattern.exec(memoText)) !== null) {
      const linkText = match[1]
      const url = match[2]
      foundLinks.push(`[${linkText}](${url})`)
      if (!sourcesMap.has(url)) {
        sourcesMap.set(url, {
          index: citationIndex++,
          title: linkText,
          url: url,
          snippet: ''
        })
      }
    }
    console.log('Markdown links found in memo:', foundLinks.length)
    console.log('Sample links:', foundLinks.slice(0, 3))
    
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
    
    // Log a sample of the text before and after citation processing
    console.log('Sample text before citation processing:', memoText.substring(0, 500))
    
    // Process annotations to add inline citations
    let citedMemoText = memoText
    
    // If we have annotations with character positions, we need to insert citations
    if (webSources.length > 0 && webSources[0].start_index !== undefined) {
      console.log('Processing annotations with character positions')
      console.log('Number of annotations:', webSources.length)
      
      // Sort annotations by start_index in reverse order to avoid position shifts
      const sortedAnnotations = [...webSources].sort((a, b) => b.start_index - a.start_index)
      
      // Insert citations at the specified positions
      for (const annotation of sortedAnnotations) {
        if (annotation.start_index !== undefined && annotation.end_index !== undefined) {
          const citedText = memoText.substring(annotation.start_index, annotation.end_index)
          console.log(`Processing citation: "${citedText}" -> ${annotation.url}`)
          
          // OpenAI might already have added brackets, check for this
          if (citedText.match(/^\[.*\]$/)) {
            // Already has brackets, just add the URL
            const citation = `${citedText}(${annotation.url})`
            citedMemoText = citedMemoText.substring(0, annotation.start_index) + citation + citedMemoText.substring(annotation.end_index)
          } else {
            // Add brackets and URL
            const citation = `[${citedText}](${annotation.url})`
            citedMemoText = citedMemoText.substring(0, annotation.start_index) + citation + citedMemoText.substring(annotation.end_index)
          }
        }
      }
      
      console.log('Processed', sortedAnnotations.length, 'annotations')
    }
    
    // Check if citations were added
    const hasInlineCitations = /\[([^\]]+)\]\(https?:\/\/[^\)]+\)/.test(citedMemoText)
    console.log('Memo has inline citations after processing:', hasInlineCitations)
    console.log('Web sources available:', webSources.length)
    
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
    
    // Double check if we've successfully added citations
    const hasProcessedCitations = /\[(\d+)\]/.test(citedMemoText) || hasInlineCitations
    console.log('Memo has citations after processing:', hasProcessedCitations)
    
    console.log('Sample text after citation processing:', citedMemoText.substring(0, 500))
    console.log('Citations replaced:', sourcesMap.size > 0 ? 'Yes' : 'No')
    
    // Clean up any malformed citations
    citedMemoText = citedMemoText
      .replace(/\[(\d+)\]\]\[(\d+)\]/g, '[$1]') // Fix [1]][1] to [1]
      .replace(/\[([^\]]+)\]\[(\d+)\]/g, '[$1]') // Fix [text][1] to [text]
      .replace(/\]\]/g, ']') // Remove double brackets
    
    console.log('Final memo length:', citedMemoText.length)
    console.log('First 1000 chars of final memo:', citedMemoText.substring(0, 1000))
    
    const parsedSections = parseMemoSections(citedMemoText)
    console.log('Parsed sections:', Object.keys(parsedSections))
    
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
    
    console.log('Memo content keys:', Object.keys(memoContent))
    console.log('Has executive summary:', !!memoContent.executive_summary)

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