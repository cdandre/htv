import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

export interface SectionGeneratorConfig {
  sectionType: string
  sectionOrder: number
  systemPrompt: string
  userPromptTemplate: (data: any) => string
  maxTokens?: number
}

// Helper function to extract basic company information from analysis data
export function getBasicCompanyInfo(dealData: any, analysisData: any): string {
  const analysis = analysisData?.result || {}
  const companyDetails = analysis.company_details || {}
  const dealDetails = analysis.deal_details || {}
  const scores = analysis.scores || {}
  
  return `
BASIC COMPANY INFORMATION:
- Company Name: ${companyDetails.name || dealData.company?.name || 'Not specified'}
- Website: ${companyDetails.website || dealData.company?.website || 'Not provided'}
- Location: ${companyDetails.location || dealData.company?.location || 'Not provided'}
- Sector/Industry: ${companyDetails.sector || 'Not specified'}
- Description: ${companyDetails.description || 'See documents'}
- Founded: ${companyDetails.founded_date || 'Not disclosed'}

DEAL INFORMATION:
- Stage: ${dealDetails.stage || dealData.stage || 'Not specified'}
- Round Size: ${dealDetails.round_size ? `$${dealDetails.round_size.toLocaleString()}` : 'Not disclosed'}
- Valuation: ${dealDetails.valuation ? `$${dealDetails.valuation.toLocaleString()}` : 'Not disclosed'}
- HTV Investment Range: ${dealDetails.check_size_min && dealDetails.check_size_max ? 
    `$${dealDetails.check_size_min.toLocaleString()} - $${dealDetails.check_size_max.toLocaleString()}` : 
    'To be determined'}

ANALYSIS SCORES:
- Team: ${scores.team || 'N/A'}/10
- Market: ${scores.market || 'N/A'}/10
- Product: ${scores.product || 'N/A'}/10
- Thesis Fit: ${scores.thesis_fit || 'N/A'}/10

INVESTMENT RECOMMENDATION: ${analysis.investment_recommendation?.decision || 'Pending analysis'}
`
}

export async function generateMemoSection(
  req: Request,
  config: SectionGeneratorConfig
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let memoId: string
  let dealData: any
  let analysisData: any
  let vectorStoreId: string | null

  try {
    const body = await req.json()
    memoId = body.memoId
    dealData = body.dealData
    analysisData = body.analysisData
    vectorStoreId = body.vectorStoreId
    const authHeader = req.headers.get('Authorization')!
    
    console.log(`[${config.sectionType}] Starting generation for memo ${memoId}`)
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Update section status to generating
    const { error: statusError } = await supabaseService
      .from('investment_memo_sections')
      .upsert({
        memo_id: memoId,
        section_type: config.sectionType,
        section_order: config.sectionOrder,
        status: 'generating',
        started_at: new Date().toISOString()
      }, {
        onConflict: 'memo_id,section_type'
      })

    if (statusError) {
      console.error(`[${config.sectionType}] Error updating section status:`, statusError)
    } else {
      console.log(`[${config.sectionType}] Updated status to 'generating'`)
    }

    // Build tools array - prioritize file_search if we have documents
    const tools = []
    
    if (vectorStoreId) {
      // Add file_search first to prioritize document analysis
      tools.push({
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      })
    }
    
    // Always add web search for market data and competitive analysis
    tools.push({
      type: 'web_search_preview',
      search_context_size: 'medium'
    })

    // Generate section content with enhanced instructions for comprehensive research
    const documentPrecedenceInstructions = `
CRITICAL INSTRUCTIONS FOR COMPREHENSIVE ANALYSIS WITH WEB RESEARCH:

1. RESEARCH APPROACH - COMBINE DOCUMENTS WITH EXTENSIVE WEB RESEARCH:
   - Use uploaded documents (file_search) as the AUTHORITATIVE SOURCE for company-specific facts:
     * Company domain, team names, specific metrics (revenue, users, growth rates)
     * Product features, technical architecture, pricing
     * Partnerships, customer names, investor details
     * Any specific claims or data points made by the company
   - ACTIVELY LEVERAGE web search (web_search_preview) to ENRICH the analysis with:
     * Market size, growth trends, and industry dynamics
     * Competitive landscape and competitor analysis
     * Technology comparisons and industry best practices
     * Regulatory environment and compliance considerations
     * Investment trends and recent funding activity in the space
     * Customer behavior patterns and market adoption trends
     * Industry expert opinions and analysis

2. WEB RESEARCH EXPECTATIONS:
   - ALWAYS conduct comprehensive web research for market context
   - Search for recent industry reports, market studies, and analyst coverage
   - Look for competitor information, funding announcements, and market movements
   - Research technology trends, emerging solutions, and innovation patterns
   - Find regulatory updates, policy changes, and compliance requirements
   - Identify industry challenges, pain points, and unmet needs
   - The goal is a RICH, COMPREHENSIVE analysis that goes beyond just the pitch deck

3. DATA ACCURACY AND SOURCING:
   - For company-specific facts: Use ONLY data from uploaded documents
   - For market context: Actively search and cite credible web sources
   - If company data is not in documents, state "not disclosed in provided documents"
   - NEVER fabricate or guess specific company metrics
   - Always indicate source with inline citations [N]
   - Distinguish between document sources and web research sources

4. CONFLICT RESOLUTION:
   - Company-specific facts from documents ALWAYS override web search results
   - If web search shows different company info than documents, trust the documents
   - For market/industry data, use the most recent and credible sources
   - Note significant discrepancies only if they impact investment decision

5. TRANSPARENCY AND CITATIONS:
   - Clearly distinguish document-sourced vs. web-researched information
   - Use phrases like:
     * "According to the company's pitch deck..." (for document info)
     * "Industry research shows..." (for web findings)
     * "Market analysis indicates..." (for web-based insights)
     * "Recent funding data suggests..." (for web research)
   - Provide specific citations for all claims and data points`
    
    // Always include basic company info at the beginning
    const basicCompanyInfo = getBasicCompanyInfo(dealData, analysisData)
    
    const userPrompt = documentPrecedenceInstructions + '\n\n' + 
                      basicCompanyInfo + '\n\n' + 
                      config.systemPrompt + '\n\n' + 
                      config.userPromptTemplate({ dealData, analysisData })
    
    console.log(`Generating ${config.sectionType} with tools:`, JSON.stringify(tools, null, 2))
    console.log(`Vector store ID: ${vectorStoreId || 'None'}`)
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: userPrompt,
        tools,
        max_output_tokens: config.maxTokens || 2000,
        store: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to generate section')
    }

    const data = await response.json()
    
    // Extract the actual text content from the Responses API format
    let sectionContent = ''
    let fileCitations = []
    
    if (typeof data.output === 'string') {
      sectionContent = data.output
    } else if (Array.isArray(data.output)) {
      // Handle array format - extract text from message content and file citations
      const messages = data.output.filter((item: any) => item.type === 'message' && item.status === 'completed')
      for (const msg of messages) {
        if (msg.content && Array.isArray(msg.content)) {
          for (const contentItem of msg.content) {
            if (contentItem.type === 'output_text') {
              // Extract the text and ensure it's properly formatted
              let text = contentItem.text || ''
              
              // Extract file citations if present
              if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
                for (const annotation of contentItem.annotations) {
                  if (annotation.type === 'file_citation' && annotation.filename) {
                    fileCitations.push(annotation.filename)
                  }
                }
              }
              
              // Remove any duplicate section titles that might be in the content
              const sectionTitlePattern = new RegExp(`^${config.sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\\s*\\n+`, 'i')
              text = text.replace(sectionTitlePattern, '')
              
              sectionContent += text
            }
          }
        }
      }
    }
    
    // Log file citations found
    if (fileCitations.length > 0) {
      console.log(`Found file citations in ${config.sectionType}:`, [...new Set(fileCitations)])
    }
    
    // Clean up formatting
    sectionContent = sectionContent.trim()
    
    // Ensure proper paragraph spacing (but don't double up)
    sectionContent = sectionContent.replace(/\n{3,}/g, '\n\n')
    
    // Ensure lists have proper spacing
    sectionContent = sectionContent.replace(/(\n)(-|\d+\.) /g, '\n\n$2 ')
    sectionContent = sectionContent.replace(/(\n\n\n)(-|\d+\.) /g, '\n\n$2 ')
    
    console.log(`Generated ${config.sectionType} section with ${sectionContent.length} characters`)

    // Update section with content
    const { error: updateError } = await supabaseService
      .from('investment_memo_sections')
      .update({
        content: sectionContent,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('memo_id', memoId)
      .eq('section_type', config.sectionType)

    if (updateError) {
      console.error(`[${config.sectionType}] Error updating section to completed:`, updateError)
      throw updateError
    } else {
      console.log(`[${config.sectionType}] Successfully completed and saved to database`)
    }

    // Update memo progress
    const { data: sections } = await supabaseService
      .from('investment_memo_sections')
      .select('status')
      .eq('memo_id', memoId)

    const completedCount = sections?.filter(s => s.status === 'completed').length || 0
    
    await supabaseService
      .from('investment_memos')
      .update({
        sections_completed: completedCount
        // Don't update generation_status here - let process-memo-sections handle final status
      })
      .eq('id', memoId)

    return new Response(JSON.stringify({ success: true, sectionType: config.sectionType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`Error generating ${config.sectionType}:`, error)
    
    // Update section status to failed
    if (memoId) {
      try {
        const supabaseService = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        
        await supabaseService
          .from('investment_memo_sections')
          .update({
            status: 'failed',
            error: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('memo_id', memoId)
          .eq('section_type', config.sectionType)
      } catch (e) {
        console.error('Failed to update error status:', e)
      }
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate section' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

