import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { extractText, getDocumentProxy } from 'npm:unpdf@0.11.0'

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
    console.log('Processing document with ID:', documentId)
    
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error('Missing environment variables')
      throw new Error('Server configuration error')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

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
    
    if (document.mime_type === 'application/pdf') {
      try {
        // Convert file data to Uint8Array for unpdf
        const arrayBuffer = await fileData.arrayBuffer()
        const pdfData = new Uint8Array(arrayBuffer)
        
        console.log(`Processing PDF: ${document.title} (${document.file_size} bytes)`)
        
        // Extract text using unpdf
        const pdf = await getDocumentProxy(pdfData)
        const { totalPages, text } = await extractText(pdf, { mergePages: true })
        
        console.log(`Successfully extracted text from ${totalPages} pages`)
        
        if (text && text.trim()) {
          extractedText = text
        } else {
          extractedText = `PDF Document: ${document.title}
Warning: No text content could be extracted from this PDF.
The PDF might contain only images or be scanned without OCR.`
        }
        
      } catch (error: any) {
        console.error('PDF extraction error:', error)
        extractedText = `PDF Document: ${document.title}
Error: Failed to extract text from PDF - ${error.message}`
      }
    } else if (document.mime_type?.startsWith('text/') || document.mime_type === 'text/csv') {
      // For text files including CSV, directly extract text
      try {
        extractedText = await fileData.text()
      } catch (error: any) {
        extractedText = `Text Document: ${document.title}
Error: Failed to extract text - ${error.message}`
      }
    } else if (
      document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      document.mime_type === 'application/msword'
    ) {
      // Word documents - for now just use metadata
      extractedText = `Word Document: ${document.title}
Type: ${document.mime_type}
Size: ${document.file_size} bytes
Note: Full Word document text extraction would require a specialized library.
For now, please convert to PDF for full text extraction.`
    } else if (
      document.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      document.mime_type === 'application/vnd.ms-excel'
    ) {
      // Excel documents
      extractedText = `Excel Document: ${document.title}
Type: ${document.mime_type}
Size: ${document.file_size} bytes
Note: Excel document extraction would require a specialized library.
For now, please export as CSV or PDF for text extraction.`
    } else if (
      document.mime_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      document.mime_type === 'application/vnd.ms-powerpoint'
    ) {
      // PowerPoint documents
      extractedText = `PowerPoint Document: ${document.title}
Type: ${document.mime_type}
Size: ${document.file_size} bytes
Note: PowerPoint document extraction would require a specialized library.
For now, please export as PDF for text extraction.`
    } else if (document.mime_type?.startsWith('image/')) {
      // Image files
      extractedText = `Image Document: ${document.title}
Type: ${document.mime_type}
Size: ${document.file_size} bytes
Note: Image text extraction (OCR) would require specialized services.
For documents with text, please use PDF format.`
    } else {
      // Other file types
      extractedText = `Document: ${document.title}
Type: ${document.mime_type || 'Unknown'}
Size: ${document.file_size} bytes
Note: Content extraction not supported for this file type.`
    }

    // Chunk the text for vector embedding
    // Using larger chunks (2000 chars) for better context with text-embedding-3-large
    const chunks = chunkText(extractedText, 2000) // 2000 chars per chunk
    
    console.log(`Processing ${chunks.length} chunks for embeddings`)
    
    // Process embeddings in batches for better performance
    const batchSize = 20 // OpenAI allows up to 2048 inputs per request
    const chunkBatches = []
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length))
      chunkBatches.push({ startIndex: i, texts: batch })
    }
    
    console.log(`Processing ${chunkBatches.length} batches of embeddings`)
    
    // Generate embeddings for each batch
    for (const batch of chunkBatches) {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          input: batch.texts,
          model: 'text-embedding-3-large',
        }),
      })

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text()
        console.error('OpenAI Embeddings API error:', errorText)
        throw new Error(`OpenAI Embeddings API error: ${embeddingResponse.statusText}`)
      }

      const embeddingData = await embeddingResponse.json()
      
      // Store chunks with embeddings
      const insertPromises = embeddingData.data.map((item: any, index: number) => {
        const chunkIndex = batch.startIndex + index
        return supabase.from('document_chunks').insert({
          document_id: documentId,
          chunk_index: chunkIndex,
          content: batch.texts[index],
          embedding: JSON.stringify(item.embedding),
          metadata: { 
            position: chunkIndex, 
            total_chunks: chunks.length,
            batch_index: chunkBatches.indexOf(batch),
            batch_size: batch.texts.length
          }
        })
      })
      
      // Execute all inserts for this batch
      const results = await Promise.all(insertPromises)
      
      // Check for errors
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        console.error('Errors inserting chunks:', errors)
        throw new Error('Failed to store some document chunks')
      }
      
      console.log(`Processed batch ${chunkBatches.indexOf(batch) + 1}/${chunkBatches.length}`)
    }

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText,
        status: 'completed',
        metadata: {
          ...document.metadata,
          chunks_count: chunks.length,
          extracted_length: extractedText.length,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', documentId)
    
    if (updateError) {
      console.error('Error updating document:', updateError)
      throw updateError
    }
    
    console.log(`Document ${documentId} processed successfully:`)
    console.log(`- Extracted text length: ${extractedText.length}`)
    console.log(`- Number of chunks: ${chunks.length}`)

    return new Response(
      JSON.stringify({ success: true, chunks: chunks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error processing document:', error)
    
    // Try to update document status to failed
    // Note: We can't re-parse the request body, so we'll skip status update if we can't get documentId
    
    return new Response(
      JSON.stringify({ error: error.message || 'Document processing failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  
  // First, handle empty or very short text
  if (!text || text.length <= chunkSize) {
    return text ? [text] : []
  }
  
  // Split by multiple delimiters to preserve structure
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    // If a single paragraph is too long, split by sentences
    if (paragraph.length > chunkSize) {
      // Improved sentence splitting regex that handles abbreviations better
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph]
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim()
        if (!trimmedSentence) continue
        
        // If adding this sentence would exceed chunk size, save current chunk
        if (currentChunk && (currentChunk.length + trimmedSentence.length + 1) > chunkSize) {
          chunks.push(currentChunk.trim())
          currentChunk = trimmedSentence
        } else {
          // Add sentence to current chunk
          currentChunk += (currentChunk ? ' ' : '') + trimmedSentence
        }
        
        // Handle very long sentences that exceed chunk size
        if (currentChunk.length > chunkSize) {
          // Split by words as last resort
          const words = currentChunk.split(/\s+/)
          let tempChunk = ''
          
          for (const word of words) {
            if (tempChunk && (tempChunk.length + word.length + 1) > chunkSize) {
              chunks.push(tempChunk.trim())
              tempChunk = word
            } else {
              tempChunk += (tempChunk ? ' ' : '') + word
            }
          }
          
          currentChunk = tempChunk
        }
      }
    } else {
      // Paragraph fits within chunk size
      const trimmedParagraph = paragraph.trim()
      if (!trimmedParagraph) continue
      
      if (currentChunk && (currentChunk.length + trimmedParagraph.length + 2) > chunkSize) {
        chunks.push(currentChunk.trim())
        currentChunk = trimmedParagraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph
      }
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // Ensure no chunk exceeds the size limit
  const finalChunks: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= chunkSize) {
      finalChunks.push(chunk)
    } else {
      // Force split oversized chunks
      for (let i = 0; i < chunk.length; i += chunkSize) {
        finalChunks.push(chunk.slice(i, i + chunkSize).trim())
      }
    }
  }
  
  return finalChunks.filter(chunk => chunk.length > 0)
}