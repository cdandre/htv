# HTV VC Operating System - Testing Guide

## 🚀 Post-Deployment Testing Checklist

### Prerequisites
- Ensure you're logged in to the application
- Have a test PDF document ready (pitch deck or investment document)
- Edge functions are deployed (confirmed ✅)

### 1. Document Processing Test

1. **Navigate to a Deal**
   - Go to Dashboard → Pipeline
   - Click on any existing deal or create a new one

2. **Upload a Document**
   - Click the Documents tab
   - Drag and drop a PDF file
   - Verify the document appears with "processing" status
   - Wait for status to change to "completed" (may take 30-60 seconds)

3. **Check Logs** (if issues occur)
   ```bash
   npx supabase functions logs process-document --tail
   ```

### 2. AI Analysis Test

1. **Generate Analysis**
   - From the deal page, click "Analyze with AI"
   - Monitor the loading state
   - Analysis should complete in 30-60 seconds

2. **Verify Web Search Integration**
   - Check the analysis for references to:
     - Recent market data
     - Competitor funding rounds
     - Founder background information
   - These indicate web search is working

3. **Check Logs** (if issues occur)
   ```bash
   npx supabase functions logs analyze-deal --tail
   ```

### 3. Memo Generation Test

1. **Generate Investment Memo**
   - After analysis completes, click "Generate Memo"
   - Verify it uses the previous analysis context
   - Check for current market conditions in the memo

2. **Test PDF Export**
   - Navigate to the generated memo
   - Click "Export PDF"
   - Verify the PDF downloads correctly
   - Open the PDF to ensure formatting is preserved

3. **Check Logs** (if issues occur)
   ```bash
   npx supabase functions logs generate-memo --tail
   ```

### 4. Knowledge Base Test

1. **Create an Article**
   - Go to Knowledge Base
   - Click "New Article"
   - Fill in all fields and save
   - Verify article appears in the list

2. **Test Search**
   - Use the search bar to find your article
   - Try searching by title, content, or tags
   - Verify vector search returns relevant results

### 5. Settings Test

1. **Update Profile**
   - Go to Settings → Profile
   - Update your name and bio
   - Click Save Changes
   - Refresh to verify changes persist

2. **Change Password**
   - Go to Settings → Security
   - Enter current and new password
   - Verify you can log in with new password

## 🔍 Debugging Common Issues

### "Unauthorized" Errors
- Check that you're logged in
- Verify JWT token is being passed in requests
- Check Supabase RLS policies

### "OpenAI API Error"
- Verify OPENAI_API_KEY is set in Supabase secrets:
  ```bash
  npx supabase secrets list
  ```
- Check OpenAI API usage/limits in their dashboard

### Slow Performance
- Normal analysis time: 30-60 seconds
- Document processing depends on size
- Check edge function logs for errors

### Web Search Not Working
- Verify the Responses API is receiving `tool_choice: 'auto'`
- Check that prompts explicitly request web search
- Monitor logs for tool usage

## 📊 Success Metrics

Your deployment is successful when:

✅ Document upload → processing → completed flow works  
✅ AI analysis includes web-searched information  
✅ Memos reference the analysis context  
✅ PDF export produces readable documents  
✅ Knowledge base search returns relevant results  
✅ Settings updates persist  

## 🚨 Emergency Rollback

If critical issues occur:

```bash
# List function versions
npx supabase functions list-versions analyze-deal

# Rollback to previous version
npx supabase functions deploy analyze-deal --version 1
```

## 📞 Support

For issues:
1. Check edge function logs first
2. Verify all environment variables are set
3. Check browser console for frontend errors
4. Review Supabase Dashboard for database issues

---

Happy Testing! 🎉