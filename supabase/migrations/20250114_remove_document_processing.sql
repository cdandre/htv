-- Remove document processing related tables and columns
-- Since OpenAI now handles all document processing directly

-- Drop the document_chunks table (no longer needed)
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Remove processing-related columns from documents table
ALTER TABLE documents 
DROP COLUMN IF EXISTS extracted_text,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS processing_error;

-- Update documents table comment
COMMENT ON TABLE documents IS 'Document metadata - actual processing handled by OpenAI';