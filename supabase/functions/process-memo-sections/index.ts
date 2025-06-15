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
      // Aggregate all sections into final memo content
      const { data: finalSections } = await supabaseService
        .from('investment_memo_sections')
        .select('*')
        .eq('memo_id', memoId)
        .order('section_order')

      const fullContent = finalSections?.map(s => `## ${getSectionTitle(s.section_type)}\n\n${s.content || ''}`).join('\n\n') || ''

      await supabaseService
        .from('investment_memos')
        .update({
          content: fullContent,
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