# HTV API Updates for OpenAI Responses API

## Updated Analysis Endpoints

### POST /deals/:dealId/analyze
Trigger AI analysis for a deal using the new Responses API.

**Request:**
```json
{
  "analysisType": "standard",
  "includeVisuals": true,
  "enableTools": {
    "webSearch": true,
    "codeInterpreter": false
  },
  "sections": [
    "team",
    "market", 
    "product",
    "competition",
    "risks"
  ],
  "previousAnalysisId": "resp_abc123",  // Optional: for follow-up analysis
  "additionalContext": {
    "focusAreas": ["market_size", "competitive_advantage"],
    "compareToPortfolio": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_ee0e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "estimatedCompletionTime": 45,
    "conversationId": "conv_770e8400",
    "webhookUrl": "https://htv-dev.vercel.app/api/webhooks/analysis/resp_ee0e8400"
  }
}
```

### GET /analyses/:responseId
Retrieve completed analysis using Response ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_ee0e8400-e29b-41d4-a716-446655440000",
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "completedAt": "2024-01-20T15:10:00Z",
    "conversationId": "conv_770e8400",
    "results": {
      "summary": "PropertyTech Inc is a B2B SaaS platform that streamlines property management...",
      "teamAnalysis": {
        "overview": "Strong technical team with relevant domain expertise",
        "founders": [
          {
            "name": "Jane Smith",
            "role": "CEO",
            "background": "10+ years in PropTech, former VP at RealEstate.com",
            "linkedIn": "https://linkedin.com/in/janesmith"
          }
        ],
        "strengths": ["Domain expertise", "Technical depth"],
        "gaps": ["Limited sales leadership"]
      },
      "marketAnalysis": {
        "marketSize": "$15B",
        "growthRate": "18% CAGR",
        "trends": [
          "Shift to cloud-based property management",
          "AI adoption in real estate"
        ],
        "tam": "$15B",
        "sam": "$3B", 
        "som": "$150M",
        "sources": [
          {
            "type": "web_search",
            "url": "https://example.com/proptech-report",
            "title": "2024 PropTech Market Analysis"
          }
        ]
      },
      "toolsUsed": {
        "webSearch": {
          "queriesRun": 5,
          "sourcesFound": 12
        }
      }
    },
    "metadata": {
      "modelUsed": "gpt-4.1",
      "tokensUsed": 45000,
      "confidence": 0.85,
      "dataSources": ["pitch_deck", "website", "linkedin", "web_search"],
      "previousResponseId": null
    }
  }
}
```

### POST /analyses/:responseId/continue
Continue analysis conversation with follow-up questions.

**Request:**
```json
{
  "input": "Can you dive deeper into the competitive landscape and identify any potential acquisition targets?",
  "enableTools": {
    "webSearch": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_ff0e8400-e29b-41d4-a716-446655440000",
    "previousResponseId": "resp_ee0e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "output": {
      "additionalAnalysis": "Based on my deeper analysis of the competitive landscape...",
      "acquisitionTargets": [
        {
          "company": "SmallProp Inc",
          "rationale": "Complementary technology, small enough for acquisition",
          "estimatedValuation": "$5-10M"
        }
      ]
    }
  }
}
```

---

## Updated Memo Generation Endpoints

### POST /deals/:dealId/memos
Generate investment memo using Responses API with conversation history.

**Request:**
```json
{
  "analysisResponseId": "resp_ee0e8400-e29b-41d4-a716-446655440000",
  "template": "standard",
  "enableTools": {
    "fileSearch": true,  // Search knowledge base
    "codeInterpreter": true  // For financial analysis
  },
  "sections": [
    "executive_summary",
    "investment_thesis",
    "company_overview",
    "market_opportunity",
    "product",
    "business_model",
    "team",
    "competition", 
    "risks",
    "financials",
    "exit_scenarios",
    "recommendation"
  ],
  "tone": "formal",
  "length": "detailed",
  "additionalGuidance": "Emphasize the AI differentiation",
  "knowledgeBaseFileIds": ["file_123", "file_456"]  // Previous memos for style
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_ff0e8400-e29b-41d4-a716-446655440000",
    "status": "generating",
    "estimatedTime": 30,
    "streamUrl": "/api/memos/resp_ff0e8400/stream"  // For streaming updates
  }
}
```

### GET /memos/:responseId/stream
Stream memo generation progress using Server-Sent Events.

**Response (SSE stream):**
```
event: response.created
data: {"responseId": "resp_ff0e8400", "status": "started"}

event: response.text.delta  
data: {"text": "# Investment Memo: PropertyTech Inc\n\n"}

event: response.text.delta
data: {"text": "## Executive Summary\n\nPropertyTech Inc represents..."}

event: response.tool_call
data: {"tool": "file_search", "status": "searching", "query": "similar proptech investments"}

event: response.completed
data: {"responseId": "resp_ff0e8400", "status": "completed", "totalTokens": 2500}
```

---

## New Background Processing Endpoints

### POST /jobs/analysis
Submit long-running analysis job for background processing.

**Request:**
```json
{
  "type": "comprehensive_due_diligence",
  "dealId": "770e8400-e29b-41d4-a716-446655440000",
  "config": {
    "depth": "exhaustive",
    "includeTools": ["web_search", "code_interpreter"],
    "maxTokens": 100000,
    "sections": ["all"]
  },
  "notificationWebhook": "https://htv.app/webhooks/job-complete"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_330e8400-e29b-41d4-a716-446655440000",
    "responseId": "resp_background_440e8400",
    "status": "queued",
    "estimatedDuration": "10-15 minutes",
    "queuePosition": 3
  }
}
```

### GET /jobs/:jobId/status
Check background job status.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job_330e8400-e29b-41d4-a716-446655440000",
    "responseId": "resp_background_440e8400",
    "status": "in_progress",
    "progress": {
      "completed": 60,
      "currentStep": "Analyzing competitive landscape",
      "stepsCompleted": ["Document parsing", "Team analysis", "Market research"],
      "estimatedTimeRemaining": "5 minutes"
    }
  }
}
```

---

## New Conversation Management Endpoints

### GET /conversations/:dealId
Get conversation history for a deal.

**Response:**
```json
{
  "success": true,
  "data": {
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "conversations": [
      {
        "conversationId": "conv_770e8400",
        "responses": [
          {
            "responseId": "resp_ee0e8400",
            "type": "analysis",
            "createdAt": "2024-01-20T15:00:00Z",
            "summary": "Initial deal analysis"
          },
          {
            "responseId": "resp_ff0e8400",
            "type": "follow_up",
            "createdAt": "2024-01-20T15:30:00Z",
            "summary": "Competitive deep dive"
          }
        ]
      }
    ]
  }
}
```

### DELETE /responses/:responseId
Delete a stored response (for GDPR compliance).

**Response:**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_ee0e8400-e29b-41d4-a716-446655440000",
    "deleted": true,
    "deletedAt": "2024-01-20T16:00:00Z"
  }
}
```

---

## Updated SDK Examples

### TypeScript/JavaScript with Responses API
```typescript
import { HTVClient } from '@htv/sdk';

const client = new HTVClient({
  apiKey: process.env.HTV_API_KEY,
  environment: 'production'
});

// Create a deal and run analysis with tools
const deal = await client.deals.create({
  companyName: 'SmartHome AI',
  stage: 'sourced'
});

// Upload documents
const documents = await client.documents.upload(deal.id, files);

// Trigger analysis with web search
const analysis = await client.analyses.create(deal.id, {
  analysisType: 'standard',
  enableTools: { webSearch: true },
  includeVisuals: true
});

// Stream the analysis progress
const stream = await client.analyses.stream(analysis.responseId);
for await (const event of stream) {
  console.log(event.type, event.data);
}

// Continue conversation
const followUp = await client.analyses.continue(analysis.responseId, {
  input: 'What are the main regulatory risks?'
});

// Generate memo using previous analysis
const memo = await client.memos.generate(deal.id, {
  analysisResponseId: analysis.responseId,
  enableTools: { fileSearch: true },
  knowledgeBaseFileIds: ['file_123', 'file_456']
});
```

---

## Webhook Event Updates

### New Webhook Events
```json
// Tool execution started
{
  "event": "response.tool_call.started",
  "timestamp": "2024-01-20T15:05:00Z",
  "data": {
    "responseId": "resp_ee0e8400",
    "tool": "web_search",
    "query": "proptech market size 2024"
  }
}

// Tool execution completed
{
  "event": "response.tool_call.completed", 
  "timestamp": "2024-01-20T15:05:30Z",
  "data": {
    "responseId": "resp_ee0e8400",
    "tool": "web_search",
    "resultsFound": 8,
    "sourcesUsed": 3
  }
}

// Conversation linked
{
  "event": "response.conversation.linked",
  "timestamp": "2024-01-20T15:30:00Z",
  "data": {
    "responseId": "resp_ff0e8400",
    "previousResponseId": "resp_ee0e8400",
    "conversationId": "conv_770e8400"
  }
}
```

---

## Migration Notes

### Breaking Changes from Chat Completions API
1. **Endpoint URL**: `/chat/completions` → `/responses`
2. **Message Format**: `messages` array → `input` string/array
3. **System Message**: `system` role → `instructions` parameter
4. **Response Structure**: Nested choices → Direct output array
5. **Conversation State**: Manual message history → `previous_response_id`

### New Features Available
1. **Built-in Tools**: Web search, file search, code interpreter
2. **Stateful Conversations**: Automatic context management
3. **Background Processing**: Long-running analysis jobs
4. **Response Storage**: Responses stored for retrieval
5. **Streaming Events**: More granular streaming updates
6. **Multi-modal Input**: Native image analysis support

### Deprecation Timeline
- Chat Completions API will be deprecated by mid-2026
- All new features will only be added to Responses API
- Existing Chat Completions code should be migrated by Q2 2025