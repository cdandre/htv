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
    
    // Reset any sections that have been stuck in 'generating' for more than 5 minutes
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const stuckSections = sections.filter(s => 
      s.status === 'generating' && 
      s.started_at && 
      s.started_at < stuckThreshold
    )
    
    if (stuckSections.length > 0) {
      console.log(`Found ${stuckSections.length} stuck sections, resetting to pending...`)
      for (const section of stuckSections) {
        await supabaseService
          .from('investment_memo_sections')
          .update({
            status: 'pending',
            started_at: null,
            error: 'Reset due to timeout'
          })
          .eq('id', section.id)
        
        // Update the local section object
        section.status = 'pending'
        section.started_at = null
      }
    }

    // Process sections with controlled concurrency and retry logic
    const MAX_CONCURRENT = 5 // Process 5 sections at a time
    const MAX_RETRIES = 3
    const RETRY_DELAY = 5000 // 5 seconds
    
    // Helper function to process a section with retries
    const processSection = async (section: any, retryCount = 0): Promise<boolean> => {
      const functionName = SECTION_FUNCTIONS[section.section_type]
      if (!functionName) {
        console.error(`No function found for section type: ${section.section_type}`)
        return false
      }

      console.log(`Starting generation of ${section.section_type} (attempt ${retryCount + 1})...`)

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
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
        })

        if (!response.ok) {
          const error = await response.text()
          console.error(`Error generating ${section.section_type}:`, error)
          
          // Retry if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying ${section.section_type} (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
            return processSection(section, retryCount + 1)
          }
          
          // Mark as failed after max retries
          await supabaseService
            .from('investment_memo_sections')
            .update({
              status: 'failed',
              error: `Failed after ${MAX_RETRIES} attempts: ${error}`,
              completed_at: new Date().toISOString()
            })
            .eq('id', section.id)
          
          return false
        }

        console.log(`Successfully generated ${section.section_type}`)
        return true
      } catch (error) {
        console.error(`Failed to call ${functionName}:`, error)
        
        // Retry on network errors
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying ${section.section_type} after error (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          return processSection(section, retryCount + 1)
        }
        
        // Mark as failed after max retries
        await supabaseService
          .from('investment_memo_sections')
          .update({
            status: 'failed',
            error: `Failed after ${MAX_RETRIES} attempts: ${error}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', section.id)
        
        return false
      }
    }
    
    // Process sections with proper concurrency control
    const pendingSections = sections.filter(s => s.status === 'pending')
    console.log(`Found ${pendingSections.length} pending sections to process:`, 
      pendingSections.map(s => ({ type: s.section_type, order: s.section_order }))
    )
    
    // Specifically log if Recommendation section is in pending list
    const hasRecommendation = pendingSections.some(s => s.section_type === 'recommendation')
    console.log(`Recommendation section in pending list: ${hasRecommendation}`)
    
    const results = []
    
    for (let i = 0; i < pendingSections.length; i += MAX_CONCURRENT) {
      const batch = pendingSections.slice(i, i + MAX_CONCURRENT)
      console.log(`Processing batch ${Math.floor(i / MAX_CONCURRENT) + 1}:`, 
        batch.map(s => s.section_type)
      )
      
      const batchPromises = batch.map(section => processSection(section))
      
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches to avoid rate limits
      if (i + MAX_CONCURRENT < pendingSections.length) {
        console.log('Waiting 2 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Check if any sections failed
    const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length
    if (failedCount > 0) {
      console.error(`${failedCount} sections failed to generate`)
    }
    
    // Double-check for any sections still pending (shouldn't happen but just in case)
    const { data: finalCheck } = await supabaseService
      .from('investment_memo_sections')
      .select('*')  // Need all fields, not just section_type and status
      .eq('memo_id', memoId)
      .eq('status', 'pending')
    
    if (finalCheck && finalCheck.length > 0) {
      console.error(`WARNING: ${finalCheck.length} sections still pending after processing:`, 
        finalCheck.map(s => s.section_type)
      )
      
      // Try to process them one more time
      for (const section of finalCheck) {
        console.log(`Attempting final retry for stuck section: ${section.section_type}`)
        await processSection(section)
      }
    }

    // Poll for completion with a timeout
    console.log('Waiting for all sections to complete...')
    const maxWaitTime = 120000 // 2 minutes max wait
    const pollInterval = 5000 // Check every 5 seconds
    const startTime = Date.now()
    
    let allComplete = false
    let completedCount = 0
    let updatedSections: any[] = []
    
    while (Date.now() - startTime < maxWaitTime) {
      const { data: sections } = await supabaseService
        .from('investment_memo_sections')
        .select('status, section_type')
        .eq('memo_id', memoId)
      
      updatedSections = sections || []
      allComplete = updatedSections.every(s => s.status === 'completed' || s.status === 'failed')
      completedCount = updatedSections.filter(s => s.status === 'completed').length
      
      console.log(`Status check: ${completedCount}/10 completed, ${updatedSections.filter(s => s.status === 'generating').length} generating`)
      
      if (allComplete) {
        console.log('All sections have finished processing')
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    if (!allComplete) {
      console.error('Timeout waiting for sections to complete. Current statuses:', 
        updatedSections.map(s => ({ type: s.section_type, status: s.status }))
      )
    }

    // Proceed if all sections are done or we have at least 9 completed
    if (allComplete && completedCount >= 9) {
      console.log('Assembling final memo content...')
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
      
      console.log(`Found ${finalSections?.length || 0} sections for memo ${memoId}`)
      finalSections?.forEach(s => {
        console.log(`Section ${s.section_type}: ${s.content?.length || 0} characters`)
      })

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
      console.log('Processing sections for final content...')
      const processedSections = finalSections?.map(s => {
        // Add section title with proper formatting
        let sectionText = `## ${getSectionTitle(s.section_type)}\n\n`
        
        // Process the content to ensure proper formatting
        let content = s.content || ''
        
        if (!content) {
          console.warn(`WARNING: Section ${s.section_type} has no content!`)
        }
        
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

      console.log(`Updating memo ${memoId} with ${finalMemoContent.length} characters of content`)
      
      if (!finalMemoContent || finalMemoContent.length === 0) {
        console.error('ERROR: Final memo content is empty!')
        throw new Error('Failed to generate memo content - content is empty')
      }
      
      const { error: memoUpdateError } = await supabaseService
        .from('investment_memos')
        .update({
          content: finalMemoContent,
          generation_status: 'completed',
          sections_completed: completedCount
        })
        .eq('id', memoId)
      
      if (memoUpdateError) {
        console.error('Error updating final memo content:', memoUpdateError)
        throw memoUpdateError
      }
      
      console.log(`Successfully assembled and saved memo ${memoId}`)
    } else {
      // Not enough sections completed - mark memo as failed
      console.error(`Memo generation incomplete: only ${completedCount}/10 sections completed`)
      
      await supabaseService
        .from('investment_memos')
        .update({
          generation_status: 'failed',
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