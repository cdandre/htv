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
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
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
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        tools: [{ 
          type: 'web_search_preview'
        }],
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
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Research Search] OpenAI API error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to search')
    }

    const data = await response.json()
    console.log('[Research Search] Full response:', JSON.stringify(data, null, 2))
    console.log('[Research Search] Response type:', Array.isArray(data) ? 'array' : typeof data)

    // Extract the results from the response
    let searchResults: any[] = []
    let rawText = ''
    let annotations: any[] = []

    // The response is an array with web_search_call and message items
    if (Array.isArray(data)) {
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
    } else if (data.output_text) {
      // Handle direct output_text format
      console.log('[Research Search] Found output_text directly')
      rawText = data.output_text
    } else if (typeof data === 'string') {
      console.log('[Research Search] Response is string')
      rawText = data
    } else if (data.output) {
      // Check for output property
      console.log('[Research Search] Found output property, type:', typeof data.output)
      if (typeof data.output === 'string') {
        rawText = data.output
      } else if (Array.isArray(data.output)) {
        for (const item of data.output) {
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