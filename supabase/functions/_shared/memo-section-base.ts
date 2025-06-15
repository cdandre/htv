import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

export interface SectionGeneratorConfig {
  sectionType: string
  sectionOrder: number
  systemPrompt: string
  userPromptTemplate: (data: any) => string
  maxTokens?: number
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

  try {
    const { memoId, dealData, analysisData, vectorStoreId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
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
      console.error('Error updating section status:', statusError)
    }

    // Build tools array
    const tools = [{
      type: 'web_search_preview',
      search_context_size: 'medium'
    }]
    
    if (vectorStoreId) {
      tools.push({
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      })
    }

    // Generate section content
    const userPrompt = config.userPromptTemplate({ dealData, analysisData })
    
    const response = await fetch('https://api.openai.com/v1/beta/responses/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'X-Beta': 'responses'
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools,
        max_tokens: config.maxTokens || 2000,
        temperature: 0.7,
        response_format: {
          type: 'structured_response',
          include_citations: true
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to generate section')
    }

    const data = await response.json()
    let sectionContent = data.content || ''

    // Process citations
    if (data.citations && data.citations.length > 0) {
      console.log(`Processing ${data.citations.length} citations for ${config.sectionType}`)
      const processedContent = processResponseCitations(sectionContent, data.citations)
      sectionContent = processedContent
    }

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
      throw updateError
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
        sections_completed: completedCount,
        generation_status: completedCount === 10 ? 'completed' : 'generating'
      })
      .eq('id', memoId)

    return new Response(JSON.stringify({ success: true, sectionType: config.sectionType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`Error generating ${config.sectionType}:`, error)
    
    // Update section status to failed
    try {
      const { memoId } = await req.json()
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

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

function processResponseCitations(content: string, citations: any[]): string {
  // Sort citations by start position in descending order
  const sortedCitations = [...citations].sort((a, b) => b.start_index - a.start_index)
  
  let processedContent = content
  
  for (const citation of sortedCitations) {
    const citationNumber = `[${citation.metadata.citation_number}]`
    const startIndex = citation.start_index
    const endIndex = citation.end_index
    
    // Check if citation already exists at this position
    const textAfterPosition = processedContent.substring(endIndex)
    if (!textAfterPosition.startsWith('[')) {
      // Insert citation number after the cited text
      processedContent = 
        processedContent.substring(0, endIndex) + 
        citationNumber + 
        processedContent.substring(endIndex)
    }
  }
  
  return processedContent
}