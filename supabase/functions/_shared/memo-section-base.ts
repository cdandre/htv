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
    const userPrompt = config.systemPrompt + '\n\n' + config.userPromptTemplate({ dealData, analysisData })
    
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
    if (typeof data.output === 'string') {
      sectionContent = data.output
    } else if (Array.isArray(data.output)) {
      // Handle array format - extract text from message content
      const messages = data.output.filter((item: any) => item.type === 'message' && item.status === 'completed')
      for (const msg of messages) {
        if (msg.content && Array.isArray(msg.content)) {
          for (const contentItem of msg.content) {
            if (contentItem.type === 'output_text' && contentItem.text) {
              // Extract the text and ensure it's properly formatted
              let text = contentItem.text
              
              // Remove any duplicate section titles that might be in the content
              const sectionTitlePattern = new RegExp(`^${config.sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\\s*\\n+`, 'i')
              text = text.replace(sectionTitlePattern, '')
              
              sectionContent += text
            }
          }
        }
      }
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

