# Security Guidelines for HTV VC Operating System

## Environment Variable Security

### Critical Security Rules

1. **NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to the client**
   - This key bypasses all Row Level Security (RLS) policies
   - Only use in Supabase Edge Functions
   - Never add to Vercel, Netlify, or any frontend hosting service

2. **Keep `OPENAI_API_KEY` server-side only**
   - Used in Next.js API routes (server-side)
   - Used in Supabase Edge Functions
   - Never import in client components or pages

### Environment Variable Storage Matrix

| Variable | Dev (.env.local) | Vercel/Netlify | Supabase Secrets | Public |
|----------|------------------|----------------|------------------|--------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | ✅ | ❌ | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | ✅ | ❌ | ✅ |
| NEXT_PUBLIC_APP_URL | ✅ | ✅ | ❌ | ✅ |
| OPENAI_API_KEY | ✅ | ✅ | ✅ | ❌ |
| SUPABASE_SERVICE_ROLE_KEY | ✅* | ❌ | ✅ | ❌ |

*Only for local edge function testing

### Setting Production Secrets

#### Vercel/Netlify
```bash
# Add via dashboard or CLI
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

#### Supabase Edge Functions
```bash
# Set secrets for edge functions
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# List secrets (shows names only, not values)
supabase secrets list
```

### Security Best Practices

1. **API Key Management**
   - Use different keys for dev/staging/production
   - Set spending limits on OpenAI dashboard
   - Rotate keys every 90 days
   - Monitor usage for anomalies

2. **Code Security**
   - Never log sensitive environment variables
   - Always check authentication before using OpenAI API
   - Implement rate limiting on API endpoints
   - Validate all user inputs

3. **Database Security**
   - Always use RLS policies for client access
   - Service role key only for admin operations
   - Audit database access regularly
   - Use parameterized queries

4. **Error Handling**
   - Never expose internal error details to clients
   - Log errors server-side only
   - Sanitize error messages
   - Use generic error responses

### Common Security Mistakes to Avoid

1. ❌ Adding service role key to frontend hosting
2. ❌ Using OpenAI API key in client components
3. ❌ Committing .env.local to git
4. ❌ Logging environment variables
5. ❌ Hardcoding secrets in code
6. ❌ Using same keys across environments
7. ❌ Not setting API spending limits
8. ❌ Bypassing RLS without admin checks

### Incident Response

If a secret is exposed:
1. Immediately revoke the compromised key
2. Generate new keys
3. Update all environments
4. Audit logs for unauthorized usage
5. Notify team members
6. Review how exposure occurred

### Monitoring

- Set up OpenAI usage alerts
- Monitor Supabase database queries
- Track API endpoint usage
- Review edge function logs
- Set up error tracking (e.g., Sentry)