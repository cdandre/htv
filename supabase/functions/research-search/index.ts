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
    const { query, searchType = 'general' } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      console.error('[Research Search] OPENAI_API_KEY is not set')
      throw new Error('OpenAI API key is not configured')
    }
    
    console.log('[Research Search] OpenAI key exists:', !!openaiKey, 'Key starts with:', openaiKey.substring(0, 7))
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Customize the search prompt based on searchType
    let searchPrompt = query
    if (searchType === 'industry') {
      searchPrompt = `venture capital housing technology "${query}" recent news investments trends`
    } else if (searchType === 'competitors') {
      searchPrompt = `"${query}" competitors comparison venture capital funding`
    } else if (searchType === 'market') {
      searchPrompt = `"${query}" market analysis trends statistics venture capital`
    }

    console.log(`[Research Search] Query: "${query}", Type: ${searchType}, Enhanced: "${searchPrompt}"`)

    // Use the OpenAI Responses API with web_search tool
    console.log('[Research Search] Calling OpenAI Responses API...')
    
    const requestBody = {
      model: 'gpt-4.1',
      tools: [{ 
        type: 'web_search_preview'
      }],
      tool_choice: { type: 'web_search_preview' }, // Force use of web search
      input: `Search for the latest news, articles, and insights about: ${searchPrompt}
      
Focus on:
- Recent venture capital investments and funding rounds
- Industry trends and market analysis
- Technology innovations and startups
- Policy changes and regulatory updates
- Market reports and statistics

Return the most relevant and recent results with clear titles, sources, dates, and brief summaries.
Format the response as a clear list of findings.`,
      max_output_tokens: 4000,
      store: true
    }
    
    console.log('[Research Search] Request body:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('[Research Search] Response status:', response.status)
    console.log('[Research Search] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Research Search] OpenAI API error response:', errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log('[Research Search] Full response:', JSON.stringify(data, null, 2))
    console.log('[Research Search] Response type:', Array.isArray(data) ? 'array' : typeof data)
    console.log('[Research Search] Response keys:', Object.keys(data))

    // Extract the results from the response
    let searchResults: any[] = []
    let rawText = ''
    let annotations: any[] = []

    // First check for direct output_text (SDK format)
    if (data.output_text) {
      console.log('[Research Search] Found output_text directly')
      rawText = data.output_text
    } 
    // Then check for array format (documented format)
    else if (Array.isArray(data)) {
      console.log('[Research Search] Processing array response with', data.length, 'items')
      for (const item of data) {
        console.log('[Research Search] Item type:', item.type, 'status:', item.status)
        if (item.type === 'message' && item.status === 'completed' && item.content) {
          for (const content of item.content) {
            console.log('[Research Search] Content type:', content.type)
            if (content.type === 'output_text') {
              rawText = content.text || ''
              annotations = content.annotations || []
            }
          }
        }
      }
    } 
    // Check for output property
    else if (data.output) {
      console.log('[Research Search] Found output property, type:', typeof data.output)
      if (typeof data.output === 'string') {
        rawText = data.output
      } else if (Array.isArray(data.output)) {
        console.log('[Research Search] Output is array with', data.output.length, 'items')
        for (const item of data.output) {
          console.log('[Research Search] Output item type:', item.type)
          if (item.type === 'message' && item.content) {
            for (const content of item.content) {
              if (content.type === 'output_text') {
                rawText = content.text || ''
                annotations = content.annotations || []
              }
            }
          }
        }
      }
    }
    // Direct string response
    else if (typeof data === 'string') {
      console.log('[Research Search] Response is string')
      rawText = data
    }

    console.log(`[Research Search] Found ${annotations.length} URL citations`)
    console.log(`[Research Search] Raw text length: ${rawText.length}`)

    // If no text was extracted, return empty results
    if (!rawText) {
      console.log('[Research Search] No text content found in response')
      return new Response(
        JSON.stringify({
          results: [],
          query,
          searchType,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the raw text into structured results
    const lines = rawText.split('\n').filter(line => line.trim())
    let currentResult: any = null
    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Check if this is a section header
      if (trimmedLine.match(/^(Recent|Latest|Key|Top|Notable)/i) || trimmedLine.endsWith(':')) {
        currentSection = trimmedLine
        continue
      }

      // Check if this is a numbered or bulleted item
      if (trimmedLine.match(/^[\d\-\*•]\./)) {
        if (currentResult) {
          searchResults.push(currentResult)
        }
        
        // Extract title from the line
        const titleMatch = trimmedLine.match(/^[\d\-\*•]\.\s*\*?\*?(.+?)\*?\*?(?:\s*[-–—]\s*|$)/)
        const title = titleMatch ? titleMatch[1].trim() : trimmedLine
        
        currentResult = {
          title,
          snippet: '',
          source: currentSection,
          url: null,
          published_date: null,
          tags: []
        }
      } else if (currentResult) {
        // This is continuation of the current result
        currentResult.snippet += (currentResult.snippet ? ' ' : '') + trimmedLine
        
        // Try to extract date
        const dateMatch = trimmedLine.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/)
        if (dateMatch) {
          currentResult.published_date = new Date(dateMatch[0]).toISOString()
        }
        
        // Extract source if mentioned
        const sourceMatch = trimmedLine.match(/\(([^)]+)\)$/)
        if (sourceMatch) {
          currentResult.source = sourceMatch[1]
        }
      }
    }

    // Don't forget the last result
    if (currentResult) {
      searchResults.push(currentResult)
    }

    // Match annotations to results based on position in text
    for (const annotation of annotations) {
      if (annotation.type === 'url_citation') {
        // Find the result that contains this citation
        const citationText = rawText.substring(annotation.start_index, annotation.end_index)
        for (const result of searchResults) {
          if (result.snippet.includes(citationText) || result.title.includes(citationText)) {
            result.url = annotation.url
            if (annotation.title && !result.source) {
              result.source = annotation.title
            }
            break
          }
        }
      }
    }

    // Add tags based on content
    searchResults = searchResults.map(result => {
      const tags = []
      const text = (result.title + ' ' + result.snippet).toLowerCase()
      
      if (text.includes('funding') || text.includes('investment') || text.includes('raise')) {
        tags.push('funding')
      }
      if (text.includes('proptech') || text.includes('real estate tech')) {
        tags.push('proptech')
      }
      if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) {
        tags.push('ai')
      }
      if (text.includes('sustainability') || text.includes('climate') || text.includes('green')) {
        tags.push('sustainability')
      }
      if (text.includes('policy') || text.includes('regulation') || text.includes('government')) {
        tags.push('policy')
      }
      if (text.includes('market') || text.includes('trend') || text.includes('analysis')) {
        tags.push('market-analysis')
      }
      
      return { ...result, tags }
    })

    console.log(`[Research Search] Parsed ${searchResults.length} results`)

    return new Response(
      JSON.stringify({
        results: searchResults,
        query,
        searchType,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Research search error:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to perform research search' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})