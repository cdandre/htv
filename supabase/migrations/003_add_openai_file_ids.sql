-- Add openai_file_id to documents table to store file IDs from OpenAI
ALTER TABLE documents ADD COLUMN openai_file_id TEXT;

-- Add openai_vector_store_id to deal_analyses to store vector store IDs
ALTER TABLE deal_analyses ADD COLUMN openai_vector_store_id TEXT;

-- Create index for faster lookups
CREATE INDEX idx_documents_openai_file_id ON documents(openai_file_id) WHERE openai_file_id IS NOT NULL;
CREATE INDEX idx_deal_analyses_vector_store_id ON deal_analyses(openai_vector_store_id) WHERE openai_vector_store_id IS NOT NULL;