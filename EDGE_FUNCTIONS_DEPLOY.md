# Edge Functions Deployment Instructions

## 1. Set API Keys

First, set the OpenAI API key as a secret (only needed once):
```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

## 2. Deploy Edge Functions

Deploy all edge functions:
```bash
# Document processing function
supabase functions deploy process-document --no-verify-jwt

# Deal analysis function
supabase functions deploy analyze-deal

# Memo generation function
supabase functions deploy generate-memo
```

## 2. Create Storage Bucket

Run this SQL in Supabase SQL Editor:
```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Set up RLS policies for documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their organization's documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_profiles.id 
    FROM user_profiles 
    WHERE user_profiles.organization_id = (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);
```

## 3. Create Initial Organization and User

After running the migration, create an initial organization and update your user profile:

```sql
-- Create HTV organization
INSERT INTO organizations (name, settings)
VALUES ('Home Technology Ventures', '{"initial": true}'::jsonb)
RETURNING id;

-- Update your user profile with the organization ID
-- Replace 'your-user-id' with your actual Supabase auth user ID
-- Replace 'org-id' with the ID returned from the previous query
UPDATE user_profiles
SET 
  organization_id = 'org-id',
  role = 'admin',
  full_name = 'Your Name'
WHERE id = 'your-user-id';
```

## 4. Webhook for Document Processing

After deploying the Edge Function, set up a database webhook to trigger document processing:

```sql
-- This creates a trigger to call the Edge Function when a document is uploaded
CREATE OR REPLACE FUNCTION trigger_document_processing()
RETURNS trigger AS $$
BEGIN
  -- Call the Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object('documentId', NEW.id)
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_document_created
AFTER INSERT ON documents
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION trigger_document_processing();
```

Note: The webhook approach requires the `pg_net` extension. Alternatively, you can call the Edge Function directly from your Next.js API routes.