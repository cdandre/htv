import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category')
    const sector = searchParams.get('sector')
    const search = searchParams.get('search')
    
    let query = supabase
      .from('knowledge_articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (sector) {
      query = query.eq('sector', sector)
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,tags.cs.{${search}}`)
    }
    
    const { data: articles, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { title, category, sector, content, excerpt, tags } = body
    
    // Get user profile for author info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    // Create article
    const { data: article, error: articleError } = await supabase
      .from('knowledge_articles')
      .insert({
        title,
        category,
        sector,
        content,
        excerpt: excerpt || content.substring(0, 200) + '...',
        tags: tags || [],
        author: profile?.full_name || user.email,
        author_id: user.id,
        read_time: Math.ceil(content.split(' ').length / 200) + ' min',
        views: 0
      })
      .select()
      .single()
    
    if (articleError) {
      return NextResponse.json({ error: articleError.message }, { status: 400 })
    }
    
    // Process content for vector search
    const chunks = chunkText(content, 1000)
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (openaiKey) {
      for (let i = 0; i < chunks.length; i++) {
        // Generate embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            input: chunks[i],
            model: 'text-embedding-3-small',
          }),
        })
        
        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.data[0].embedding
          
          // Store chunk with embedding
          await supabase.from('article_chunks').insert({
            article_id: article.id,
            chunk_index: i,
            content: chunks[i],
            embedding: JSON.stringify(embedding),
            metadata: { position: i, total_chunks: chunks.length }
          })
        }
      }
    }
    
    return NextResponse.json({ article })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}