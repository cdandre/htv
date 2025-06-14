import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    // Increment view count
    await supabase
      .from('knowledge_articles')
      .update({ views: article.views + 1 })
      .eq('id', params.id)
    
    return NextResponse.json({ article })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { title, category, sector, content, excerpt, tags } = body
    
    // Update article
    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .update({
        title,
        category,
        sector,
        content,
        excerpt,
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Update chunks if content changed
    if (content) {
      // Delete old chunks
      await supabase
        .from('article_chunks')
        .delete()
        .eq('article_id', params.id)
      
      // Create new chunks
      const chunks = chunkText(content, 1000)
      const openaiKey = process.env.OPENAI_API_KEY
      
      if (openaiKey) {
        for (let i = 0; i < chunks.length; i++) {
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
            
            await supabase.from('article_chunks').insert({
              article_id: params.id,
              chunk_index: i,
              content: chunks[i],
              embedding: JSON.stringify(embedding),
              metadata: { position: i, total_chunks: chunks.length }
            })
          }
        }
      }
    }
    
    return NextResponse.json({ article })
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete chunks first
    await supabase
      .from('article_chunks')
      .delete()
      .eq('article_id', params.id)
    
    // Delete article
    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
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