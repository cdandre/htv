import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()
    
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    const openai = new OpenAI({ apiKey: openaiKey })

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      throw new Error('Failed to download file')
    }

    // Extract text based on file type
    let extractedText = ''
    
    // For MVP, we'll use GPT-4 Vision for PDFs containing images
    // In production, you'd use specialized PDF libraries
    if (document.mime_type === 'application/pdf') {
      // Convert PDF to base64 for GPT-4 Vision
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      
      // Use GPT-4.1 multimodal to extract text and analyze images
      const response = await openai.responses.create({
        model: 'gpt-4.1',
        input: [
          {
            type: 'text',
            text: 'Extract all text content from this document. Also describe any charts, graphs, or images you see. Format the output as structured text.'
          },
          {
            type: 'document',
            document: {
              data: base64,
              type: 'application/pdf'
            }
          }
        ],
        store: true,
      })
      
      extractedText = response.output
    } else {
      // For other file types, we'd implement specific extraction
      extractedText = await fileData.text()
    }

    // Chunk the text for vector embedding
    const chunks = chunkText(extractedText, 1000) // 1000 chars per chunk
    
    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const embeddingResponse = await openai.embeddings.create({
        input: chunks[i],
        model: 'text-embedding-3-small',
      })
      
      const embedding = embeddingResponse.data[0].embedding
      
      // Store chunk with embedding
      await supabase.from('document_chunks').insert({
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
        metadata: { position: i, total_chunks: chunks.length }
      })
    }

    // Update document with extracted text
    await supabase
      .from('documents')
      .update({
        extracted_text: extractedText,
        status: 'completed',
      })
      .eq('id', documentId)

    return new Response(
      JSON.stringify({ success: true, chunks: chunks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing document:', error)
    
    // Update document status to failed
    if (documentId) {
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          processing_error: error.message,
        })
        .eq('id', documentId)
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

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