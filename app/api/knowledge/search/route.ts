import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { query, limit = 10 } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!openaiKey) {
      // Fallback to text search if no OpenAI key
      const { data: articles, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .limit(limit)
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ results: articles })
    }
    
    // Generate embedding for search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-3-small',
      }),
    })
    
    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding')
    }
    
    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    
    // Search using pgvector
    const { data: chunks, error: searchError } = await supabase.rpc('search_article_chunks', {
      query_embedding: queryEmbedding,
      match_count: limit * 3, // Get more chunks to aggregate by article
      match_threshold: 0.7
    })
    
    if (searchError) {
      console.error('Search error:', searchError)
      // Fallback to text search
      const { data: articles, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .limit(limit)
      
      return NextResponse.json({ results: articles || [] })
    }
    
    // Get unique article IDs from chunks
    const articleIds = [...new Set(chunks?.map((chunk: any) => chunk.article_id) || [])]
    
    if (articleIds.length === 0) {
      return NextResponse.json({ results: [] })
    }
    
    // Fetch full articles
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('*')
      .in('id', articleIds)
      .limit(limit)
    
    if (articlesError) {
      return NextResponse.json({ error: articlesError.message }, { status: 400 })
    }
    
    // Sort by relevance (based on chunk order)
    const sortedArticles = articleIds
      .map(id => articles?.find(a => a.id === id))
      .filter(Boolean)
      .slice(0, limit)
    
    return NextResponse.json({ results: sortedArticles })
  } catch (error) {
    console.error('Error searching articles:', error)
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    )
  }
}