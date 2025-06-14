-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Set up RLS policies for the documents bucket
CREATE POLICY "Users can upload documents for their organization" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view documents from their organization" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_profiles u ON u.organization_id = d.organization_id
      WHERE u.id = auth.uid()
      AND d.file_path = name
    )
  );

CREATE POLICY "Users can delete their own uploaded documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.file_path = name
      AND d.uploaded_by = auth.uid()
    )
  );