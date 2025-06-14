# Deploying Edge Functions

The process-document edge function has been updated and needs to be redeployed. Here's how to deploy it:

## Quick Deploy (All Functions)

```bash
# Deploy all edge functions at once
supabase functions deploy
```

## Deploy Specific Function

```bash
# Deploy only the process-document function
supabase functions deploy process-document
```

## Verify Deployment

After deployment, you can verify the function is working:

```bash
# Check function status
supabase functions list
```

## Troubleshooting

If you're getting 500 errors after deployment:

1. **Check function logs**:
   ```bash
   supabase functions logs process-document
   ```

2. **Verify environment variables are set**:
   ```bash
   supabase secrets list
   ```
   
   Required secrets:
   - `OPENAI_API_KEY`

3. **Test the function locally**:
   ```bash
   supabase functions serve process-document
   ```

## Common Issues

- **Import errors**: The pdfjs-dist import might need to be updated if the CDN is having issues
- **Memory limits**: Large PDFs might exceed edge function memory limits
- **Timeout**: Processing very large documents might timeout (default is 10 seconds)

## Next Steps

After deploying, test document upload and processing through the UI. The AI analysis should now show proper scores and detailed analysis based on the document content.