import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { query, dealId, limit = 10 } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!openaiKey) {
      // Fallback to text search if no OpenAI key
      let textQuery = supabase
        .from('documents')
        .select(`
          *,
          deal:deals(
            id,
            company_name,
            stage
          )
        `)
        .or(`name.ilike.%${query}%,extracted_text.ilike.%${query}%`)
        .limit(limit)
      
      if (dealId) {
        textQuery = textQuery.eq('deal_id', dealId)
      }
      
      const { data: documents, error } = await textQuery
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ results: documents })
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
    const { data: chunks, error: searchError } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      deal_id_filter: dealId || null,
      match_count: limit * 3, // Get more chunks to aggregate by document
      match_threshold: 0.7
    })
    
    if (searchError) {
      console.error('Search error:', searchError)
      // Fallback to text search
      let textQuery = supabase
        .from('documents')
        .select(`
          *,
          deal:deals(
            id,
            company_name,
            stage
          )
        `)
        .or(`name.ilike.%${query}%,extracted_text.ilike.%${query}%`)
        .limit(limit)
      
      if (dealId) {
        textQuery = textQuery.eq('deal_id', dealId)
      }
      
      const { data: documents } = await textQuery
      
      return NextResponse.json({ results: documents || [] })
    }
    
    // Get unique document IDs from chunks
    const documentIds = [...new Set(chunks?.map((chunk: any) => chunk.document_id) || [])]
    
    if (documentIds.length === 0) {
      return NextResponse.json({ results: [] })
    }
    
    // Fetch full documents with deal information
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        *,
        deal:deals(
          id,
          company_name,
          stage
        )
      `)
      .in('id', documentIds)
      .limit(limit)
    
    if (documentsError) {
      return NextResponse.json({ error: documentsError.message }, { status: 400 })
    }
    
    // Sort by relevance (based on chunk order) and add relevant chunks
    const sortedDocuments = documentIds
      .map(id => {
        const doc = documents?.find(d => d.id === id)
        if (doc) {
          // Add the most relevant chunk content
          const relevantChunks = chunks
            ?.filter((c: any) => c.document_id === id)
            .slice(0, 3)
            .map((c: any) => ({
              content: c.content,
              similarity: c.similarity
            }))
          
          return {
            ...doc,
            relevant_chunks: relevantChunks
          }
        }
        return null
      })
      .filter(Boolean)
      .slice(0, limit)
    
    return NextResponse.json({ results: sortedDocuments })
  } catch (error) {
    console.error('Error searching documents:', error)
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    )
  }
}