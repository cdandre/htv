# Storage Setup Guide

## Automatic Setup (Recommended)

If you haven't already, run the database migrations to create the storage bucket:

```bash
npx supabase db reset
```

This will create the `documents` storage bucket with proper RLS policies.

## Manual Setup (If needed)

If you need to manually create the storage bucket:

1. Go to your Supabase project dashboard
2. Navigate to Storage → Create a new bucket
3. Set the following:
   - **Bucket name**: `documents`
   - **Public**: OFF (keep it private)
   - **File size limit**: 52428800 (50MB)
   - **Allowed MIME types**: 
     - application/pdf
     - application/msword
     - application/vnd.openxmlformats-officedocument.wordprocessingml.document
     - application/vnd.ms-excel
     - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     - application/vnd.ms-powerpoint
     - application/vnd.openxmlformats-officedocument.presentationml.presentation
     - text/plain
     - text/csv

## Verification

To verify the bucket exists:

1. Go to Storage in your Supabase dashboard
2. You should see a bucket named "documents"
3. Check that RLS is enabled on the bucket

## Troubleshooting

### "Bucket not found" error
- Ensure the bucket name is exactly "documents" (lowercase)
- Check that you're connected to the correct Supabase project
- Verify your environment variables are set correctly

### Permission errors
- Ensure RLS policies are properly set up (the migration handles this)
- Verify the user is authenticated
- Check that the user belongs to an organization