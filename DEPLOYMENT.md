# HTV VC Operating System - Deployment Guide

## Prerequisites

1. **Supabase CLI**: Install the Supabase CLI
```bash
npm install -g supabase
```

2. **Environment Variables**: Ensure you have the following set in Supabase:
```bash
# Set via Supabase Dashboard or CLI
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## Edge Functions Deployment

### 1. Deploy All Edge Functions

Deploy all three edge functions at once:

```bash
# From the project root
cd htv-app

# Deploy all functions
supabase functions deploy analyze-deal
supabase functions deploy generate-memo
supabase functions deploy process-document
```

### 2. Verify Deployment

Check that functions are deployed:
```bash
supabase functions list
```

### 3. Set CORS Headers (if needed)

If you encounter CORS issues, update the Supabase Dashboard:
1. Go to Functions settings
2. Enable CORS for each function
3. Add your domain to allowed origins

## Database Migrations

### 1. Run Migrations

Apply all database migrations:
```bash
# Reset database with all migrations (WARNING: This will delete all data)
supabase db reset

# Or push just new migrations
supabase db push
```

### 2. Create Search Functions

Run the search functions migration:
```bash
supabase migration up 20240113_add_search_functions
```

## Frontend Deployment (Vercel)

### 1. Environment Variables

Set these in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 2. Deploy

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

## Post-Deployment Testing

### 1. Test Edge Functions

Test the analyze-deal function:
```bash
curl -X POST https://[your-project].supabase.co/functions/v1/analyze-deal \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"dealId": "[test-deal-id]"}'
```

### 2. Test Document Upload

1. Go to a deal page
2. Upload a test PDF
3. Check that status changes to "processing" then "completed"

### 3. Test AI Analysis

1. After document upload completes
2. Click "Analyze with AI"
3. Verify analysis appears with web search results

### 4. Test Memo Generation

1. After analysis completes
2. Click "Generate Memo"
3. Verify memo includes recent market data from web search

## Monitoring

### 1. Edge Function Logs

View function logs:
```bash
supabase functions logs analyze-deal --tail
supabase functions logs generate-memo --tail
supabase functions logs process-document --tail
```

### 2. Database Monitoring

Monitor in Supabase Dashboard:
- Check `deal_analyses` table for new entries
- Check `investment_memos` table for generated memos
- Monitor `document_chunks` for vector embeddings

## Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Ensure `OPENAI_API_KEY` is set in Supabase secrets
   - Restart edge functions after setting

2. **"Unauthorized" errors**
   - Check that user is logged in
   - Verify JWT token is being passed correctly

3. **"Failed to generate embedding"**
   - Check OpenAI API key has access to embeddings API
   - Verify you're using text-embedding-3-small model

4. **CORS errors**
   - Enable CORS in Supabase Functions settings
   - Add your domain to allowed origins

### Debug Mode

Enable debug logging:
```bash
# Set in edge function environment
supabase functions config set DEBUG=true --function analyze-deal
```

## Performance Optimization

1. **Enable Function Warming**: Keep functions warm to reduce cold starts
2. **Monitor Token Usage**: Check OpenAI usage to optimize prompts
3. **Database Indexes**: Ensure pgvector indexes are created
4. **CDN Setup**: Use Vercel's CDN for static assets

## Security Checklist

- [ ] OpenAI API key only in Supabase secrets (not in .env.local)
- [ ] RLS policies enabled on all tables
- [ ] Service role key never exposed to frontend
- [ ] All edge functions verify authentication
- [ ] CORS properly configured
- [ ] Rate limiting enabled on API routes

## Rollback Procedures

If issues occur:

1. **Rollback Edge Function**:
```bash
# List versions
supabase functions list-versions analyze-deal

# Deploy previous version
supabase functions deploy analyze-deal --version [previous-version]
```

2. **Rollback Database**:
```bash
# Restore from backup
supabase db restore --backup-id [backup-id]
```

3. **Frontend Rollback**:
- Use Vercel's instant rollback feature in dashboard

## Success Criteria

Deployment is successful when:
1. ✅ All edge functions respond with 200 status
2. ✅ Document upload → processing → analysis flow works
3. ✅ AI analysis includes web search results
4. ✅ Memos generate with current market data
5. ✅ Search returns relevant documents
6. ✅ Settings can be updated and saved
7. ✅ Knowledge base articles can be created/edited
8. ✅ PDF export works for memos

## Support

For issues:
1. Check Supabase logs for detailed errors
2. Review OpenAI API usage dashboard
3. Monitor Vercel functions tab for frontend errors
4. Contact HTV DevOps team for infrastructure issues