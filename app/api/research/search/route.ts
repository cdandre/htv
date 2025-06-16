import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, searchType = 'general' } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get user's organization for context
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, organization:organizations(name)')
      .eq('id', user.id)
      .single()

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

    // Use the Responses API with web_search tool
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
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
    console.log('[Research Search] Response structure:', JSON.stringify(data, null, 2))

    // Extract the results from the response
    let searchResults: any[] = []
    let rawText = ''
    let annotations: any[] = []

    // The response is an array with web_search_call and message items
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.type === 'message' && item.status === 'completed' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              rawText = content.text || ''
              annotations = content.annotations || []
            }
          }
        }
      }
    } else if (data.output_text) {
      // Handle direct output_text format
      rawText = data.output_text
    } else if (typeof data === 'string') {
      rawText = data
    }

    console.log(`[Research Search] Found ${annotations.length} URL citations`)
    console.log(`[Research Search] Raw text length: ${rawText.length}`)

    // If no text was extracted, return empty results
    if (!rawText) {
      console.log('[Research Search] No text content found in response')
      return NextResponse.json({
        results: [],
        query,
        searchType,
        timestamp: new Date().toISOString()
      })
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

    return NextResponse.json({
      results: searchResults,
      query,
      searchType,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Research search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform research search' },
      { status: 500 }
    )
  }
}