-- Function to search article chunks using vector similarity
CREATE OR REPLACE FUNCTION search_article_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  article_id uuid,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.article_id,
    ac.chunk_index,
    ac.content,
    1 - (ac.embedding <=> query_embedding) as similarity
  FROM article_chunks ac
  WHERE 1 - (ac.embedding <=> query_embedding) > match_threshold
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search document chunks using vector similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  deal_id_filter uuid DEFAULT NULL,
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  document_id uuid,
  deal_id uuid,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.document_id,
    d.deal_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE 
    (deal_id_filter IS NULL OR d.deal_id = deal_id_filter)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_article_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_chunks TO authenticated;