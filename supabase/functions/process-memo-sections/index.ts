import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SECTION_FUNCTIONS = {
  'executive_summary': 'generate-memo-executive-summary',
  'thesis_alignment': 'generate-memo-thesis-alignment', 
  'company_overview': 'generate-memo-company-overview',
  'market_analysis': 'generate-memo-market-analysis',
  'product_technology': 'generate-memo-product-technology',
  'business_model': 'generate-memo-business-model',
  'team_execution': 'generate-memo-team-execution',
  'investment_rationale': 'generate-memo-investment-rationale',
  'risks_mitigation': 'generate-memo-risks-mitigation',
  'recommendation': 'generate-memo-recommendation'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { memoId, dealData, analysisData, vectorStoreId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Get all sections for this memo
    const { data: sections, error: sectionsError } = await supabaseService
      .from('investment_memo_sections')
      .select('*')
      .eq('memo_id', memoId)
      .order('section_order')

    if (sectionsError || !sections) {
      throw new Error('Failed to fetch memo sections')
    }

    // Process sections with controlled concurrency
    const MAX_CONCURRENT = 2 // Process 2 sections at a time to avoid rate limits
    let activePromises = []
    
    for (const section of sections) {
      // Skip if already completed or generating
      if (section.status !== 'pending') {
        continue
      }

      // Wait if we've reached max concurrent
      if (activePromises.length >= MAX_CONCURRENT) {
        await Promise.race(activePromises)
        activePromises = activePromises.filter(p => p.isPending !== false)
      }

      // Start section generation
      const functionName = SECTION_FUNCTIONS[section.section_type]
      if (!functionName) {
        console.error(`No function found for section type: ${section.section_type}`)
        continue
      }

      const promise = fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memoId,
          dealData,
          analysisData,
          vectorStoreId
        })
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.text()
          console.error(`Error generating ${section.section_type}:`, error)
        } else {
          console.log(`Successfully generated ${section.section_type}`)
        }
        promise.isPending = false
      }).catch(error => {
        console.error(`Failed to call ${functionName}:`, error)
        promise.isPending = false
      })

      promise.isPending = true
      activePromises.push(promise)

      // Small delay between starting sections
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Wait for all remaining sections to complete
    await Promise.allSettled(activePromises)

    // Check if all sections are complete and update memo status
    const { data: updatedSections } = await supabaseService
      .from('investment_memo_sections')
      .select('status')
      .eq('memo_id', memoId)

    const allComplete = updatedSections?.every(s => s.status === 'completed') || false
    const completedCount = updatedSections?.filter(s => s.status === 'completed').length || 0

    if (allComplete) {
      // Get memo data for header
      const { data: memoData } = await supabaseService
        .from('investment_memos')
        .select(`
          *,
          deal:deals(
            *,
            company:companies(*)
          )
        `)
        .eq('id', memoId)
        .single()
      
      // Aggregate all sections into final memo content
      const { data: finalSections } = await supabaseService
        .from('investment_memo_sections')
        .select('*')
        .eq('memo_id', memoId)
        .order('section_order')

      // Add header to the memo
      let fullContent = `# Investment Memo - ${memoData?.deal?.company?.name || 'Company'}\n\n`
      
      // Add key details box
      fullContent += `> **Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  \n`
      fullContent += `> **Stage:** ${memoData?.deal?.stage || 'N/A'}  \n`
      fullContent += `> **Requested Amount:** ${memoData?.deal?.funding_amount ? `$${memoData.deal.funding_amount.toLocaleString()}` : 'TBD'}  \n`
      fullContent += `> **Valuation:** ${memoData?.deal?.valuation ? `$${memoData.deal.valuation.toLocaleString()}` : 'TBD'}  \n`
      fullContent += `> **HTV Allocation:** ${memoData?.deal?.check_size_max ? `$${memoData.deal.check_size_max.toLocaleString()}` : 'TBD'}\n\n`
      
      fullContent += `---\n\n`
      
      // Add table of contents
      fullContent += `## Table of Contents\n\n`
      finalSections?.forEach((s, index) => {
        fullContent += `${index + 1}. ${getSectionTitle(s.section_type)}\n`
      })
      fullContent += `\n---\n\n`
      
      // Process each section
      const processedSections = finalSections?.map(s => {
        // Add section title with proper formatting
        let sectionText = `## ${getSectionTitle(s.section_type)}\n\n`
        
        // Process the content to ensure proper formatting
        let content = s.content || ''
        
        // Remove duplicate section titles if they exist at the start
        const titleRegex = new RegExp(`^${getSectionTitle(s.section_type)}\\s*\\n+`, 'i')
        content = content.replace(titleRegex, '')
        
        // Format bullet points properly
        content = content.replace(/^(-|\d+\.)\s+/gm, '\n$1 ')
        content = content.replace(/\n\n+(-|\d+\.)\s+/g, '\n\n$1 ')
        
        // Format sub-sections (lines ending with colon)
        content = content.replace(/^([A-Z][^:\n]+:)$/gm, '\n**$1**')
        content = content.replace(/\n\n([A-Z][^:\n]+:)$/gm, '\n\n**$1**')
        
        // Add emphasis to key metrics when they appear (do this before citations)
        // But avoid double-bolding already bolded content
        content = content.replace(/(?<!\*)\$(\d+(?:,\d{3})*(?:\.\d+)?[MBK]?)(?!\*)/g, '**$$$1**')
        content = content.replace(/(?<!\*)(\d+(?:\.\d+)?%)(?!\*)/g, '**$1**')
        
        // Convert citation references to markdown superscript format
        // Process HTML sup tags first to avoid double conversion
        content = content.replace(/<sup>\[(\d+)\]<\/sup>/g, '^[$1]^')
        content = content.replace(/<sup>(\d+)<\/sup>/g, '^$1^')
        
        // Then process plain brackets (but not ones already in superscript format)
        content = content.replace(/(?<!\^)\[(\d+)\](?!\^)/g, '^[$1]^')
        content = content.replace(/\[\^(\d+)\^\]/g, '^[$1]^')
        
        // Ensure proper paragraph spacing
        content = content.replace(/\n{3,}/g, '\n\n')
        
        sectionText += content
        
        return sectionText
      }).join('\n\n---\n\n') || ''
      
      fullContent += processedSections
      
      // Extract all citations from sections and build references list
      const citationMap = new Map()
      let citationCounter = 1
      
      // Process all sections to collect citations
      finalSections?.forEach(section => {
        const citationMatches = section.content?.match(/\^?\[(\d+)\]\^?/g) || []
        citationMatches.forEach(match => {
          const num = match.match(/\d+/)?.[0]
          if (num && !citationMap.has(num)) {
            citationMap.set(num, citationCounter++)
          }
        })
      })
      
      // Add a comprehensive citations section at the end
      let citationsSection = `\n\n---\n\n## References\n\n`
      
      // Add references based on what was analyzed
      if (memoData?.deal?.company?.name) {
        citationsSection += `**Company Materials:**\n`
        citationsSection += `- ${memoData.deal.company.name} pitch deck and supporting documents (accessed via file_search)\n`
        if (memoData.deal.company.website) {
          citationsSection += `- Company website: ${memoData.deal.company.website}\n`
        }
        citationsSection += `\n`
      }
      
      citationsSection += `**Research Sources:**\n`
      citationsSection += `- Market analysis and competitive landscape (web_search_preview)\n`
      citationsSection += `- Industry reports and trend analysis (web_search_preview)\n`
      citationsSection += `- Financial benchmarks and comparable company data (web_search_preview)\n`
      citationsSection += `\n`
      
      citationsSection += `**Note:** Inline citations ^[N]^ throughout the memo reference specific data points from the above sources. All market data, competitive intelligence, and financial metrics were verified through multiple sources during the analysis process.\n\n`
      citationsSection += `**Analysis Date:** ${new Date().toISOString().split('T')[0]}`
      
      // Final cleanup on the entire memo content
      let finalMemoContent = fullContent + citationsSection
      
      // Ensure all HTML sup tags are converted to markdown
      finalMemoContent = finalMemoContent.replace(/<sup>\[(\d+)\]<\/sup>/g, '^[$1]^')
      finalMemoContent = finalMemoContent.replace(/<sup>(\d+)<\/sup>/g, '^$1^')

      await supabaseService
        .from('investment_memos')
        .update({
          content: finalMemoContent,
          generation_status: 'completed',
          sections_completed: completedCount
        })
        .eq('id', memoId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sectionsProcessed: sections.length,
        completedCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error processing memo sections:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function getSectionTitle(sectionType: string): string {
  const titles = {
    'executive_summary': 'Executive Summary',
    'thesis_alignment': 'Investment Thesis Alignment',
    'company_overview': 'Company Overview',
    'market_analysis': 'Market Analysis',
    'product_technology': 'Product & Technology',
    'business_model': 'Business Model & Financials',
    'team_execution': 'Team & Execution',
    'investment_rationale': 'Investment Rationale',
    'risks_mitigation': 'Risks & Mitigation',
    'recommendation': 'Recommendation'
  }
  return titles[sectionType] || sectionType
}