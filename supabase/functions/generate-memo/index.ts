import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MEMO_SECTIONS = [
  { type: 'executive_summary', order: 1, name: 'Executive Summary' },
  { type: 'thesis_alignment', order: 2, name: 'Investment Thesis Alignment' },
  { type: 'company_overview', order: 3, name: 'Company Overview' },
  { type: 'market_analysis', order: 4, name: 'Market Analysis' },
  { type: 'product_technology', order: 5, name: 'Product & Technology' },
  { type: 'business_model', order: 6, name: 'Business Model & Financials' },
  { type: 'team_execution', order: 7, name: 'Team & Execution' },
  { type: 'investment_rationale', order: 8, name: 'Investment Rationale' },
  { type: 'risks_mitigation', order: 9, name: 'Risks & Mitigation' },
  { type: 'recommendation', order: 10, name: 'Recommendation' }
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dealId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

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

    // Create the investment memo record
    const { data: memo, error: memoError } = await supabaseService
      .from('investment_memos')
      .insert({
        deal_id: dealId,
        title: `Investment Memo - ${deal.company.name}`,
        content: '', // Will be populated by sections
        generation_status: 'generating',
        sections_completed: 0,
        total_sections: MEMO_SECTIONS.length,
        created_by: user.id
      })
      .select()
      .single()

    if (memoError || !memo) {
      throw new Error('Failed to create memo record')
    }

    console.log('Created memo record:', memo.id)

    // Create section placeholders
    const sectionInserts = MEMO_SECTIONS.map(section => ({
      memo_id: memo.id,
      section_type: section.type,
      section_order: section.order,
      status: 'pending'
    }))

    const { error: sectionsError } = await supabaseService
      .from('investment_memo_sections')
      .insert(sectionInserts)

    if (sectionsError) {
      console.error('Error creating section placeholders:', sectionsError)
    }

    // Prepare data for section generation
    const sectionData = {
      memoId: memo.id,
      dealData: {
        ...deal,
        company: deal.company,
        latestAnalysis: latestAnalysis.result
      },
      analysisData: latestAnalysis,
      vectorStoreId: latestAnalysis.openai_vector_store_id
    }

    // Start section processing (fire and forget)
    fetch(`${supabaseUrl}/functions/v1/process-memo-sections`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sectionData)
    }).catch(error => {
      console.error('Error starting section processing:', error)
    })

    // Return immediately with memo ID
    return new Response(
      JSON.stringify({ 
        success: true, 
        memoId: memo.id,
        message: 'Memo generation started. Sections will be generated progressively.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error in memo orchestrator:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})