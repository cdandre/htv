# HTV VC Operating System - OpenAI Responses API Integration Guide

## Overview

This guide covers the integration of OpenAI's new Responses API, which replaces the Chat Completions API and provides enhanced capabilities for building stateful, tool-enabled AI applications. The Responses API is the foundation for HTV's Deal Screener and Memo Generator modules.

**Key Advantages:**
- Stateful conversations across multiple API calls
- Built-in tools (web search, file search, code interpreter)
- Native multi-turn conversation support
- Improved context management
- Background processing capabilities

---

## Migration from Chat Completions to Responses API

### API Endpoint Changes
```typescript
// OLD: Chat Completions API
const CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// NEW: Responses API
const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
```

### Request Structure Changes

#### Old Chat Completions Format
```typescript
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}
```

#### New Responses API Format
```typescript
interface ResponsesAPIRequest {
  model: string;
  input: string | Array<InputItem>;
  instructions?: string;  // Replaces system message
  previous_response_id?: string;  // For stateful conversations
  tools?: Array<Tool>;  // Built-in and custom tools
  store?: boolean;  // Store response for later retrieval
  background?: boolean;  // Run in background
  include?: string[];  // Additional data to include
  max_output_tokens?: number;
  temperature?: number;
  text?: {
    format: {
      type: 'text' | 'json_object';
      json_schema?: object;
    };
  };
}
```

---

## Core Implementation Patterns

### 1. Basic Response Generation

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(input: string) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: input,
    instructions: 'You are a venture capital analyst specializing in real estate technology.',
    temperature: 0.7,
    store: true,  // Store for conversation continuity
  });

  return {
    id: response.id,
    text: response.output[0].content[0].text,
    usage: response.usage,
  };
}
```

### 2. Stateful Conversations

```typescript
class ConversationManager {
  private previousResponseId: string | null = null;

  async continueConversation(input: string) {
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: input,
      previous_response_id: this.previousResponseId,
      // Instructions not needed - carried over from previous response
      store: true,
    });

    this.previousResponseId = response.id;
    return response;
  }

  async startNewConversation(input: string, instructions: string) {
    this.previousResponseId = null;
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: input,
      instructions: instructions,
      store: true,
    });

    this.previousResponseId = response.id;
    return response;
  }
}
```

### 3. Multi-Modal Input (Text + Images)

```typescript
async function analyzeChartWithText(
  textContext: string, 
  imageUrl: string
) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: textContext
          },
          {
            type: 'input_image',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          }
        ]
      }
    ],
    instructions: 'Analyze the provided chart and extract key data points.',
  });

  return response;
}
```

---

## Built-in Tools Integration

### 1. Web Search Tool

```typescript
async function dealAnalysisWithWebSearch(companyName: string) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: `Analyze ${companyName} for investment potential. Research current market position and recent news.`,
    tools: [
      {
        type: 'web_search',
        web_search: {
          max_results: 10,
          search_depth: 'comprehensive'
        }
      }
    ],
    tool_choice: 'auto',
    include: ['web_search_call.results'],  // Include search results in response
  });

  return {
    analysis: response.output[0].content[0].text,
    sources: response.output[0].content[0].annotations  // Web sources used
  };
}
```

### 2. File Search Tool

```typescript
async function searchKnowledgeBase(query: string, fileIds: string[]) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: query,
    tools: [
      {
        type: 'file_search',
        file_search: {
          file_ids: fileIds,  // Pre-uploaded knowledge base files
          max_chunks_per_file: 20,
          ranking_options: {
            score_threshold: 0.7
          }
        }
      }
    ],
    include: ['file_search_call.results'],
  });

  return response;
}
```

### 3. Code Interpreter Tool

```typescript
async function analyzeFinancialData(csvData: string) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: `Analyze this financial data and create visualizations: ${csvData}`,
    tools: [
      {
        type: 'code_interpreter',
        code_interpreter: {}
      }
    ],
    include: ['code_interpreter_call.outputs'],
  });

  // Response includes executed code and generated charts
  return response;
}
```

---

## Custom Function Calling

### 1. Define Custom Functions

```typescript
const customTools = [
  {
    type: 'function',
    function: {
      name: 'search_portfolio_companies',
      description: 'Search HTV portfolio for similar companies',
      parameters: {
        type: 'object',
        properties: {
          sector: {
            type: 'string',
            description: 'The sector to search in'
          },
          criteria: {
            type: 'object',
            properties: {
              stage: { type: 'string' },
              geography: { type: 'string' },
              minRevenue: { type: 'number' }
            }
          }
        },
        required: ['sector']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_market_size',
      description: 'Calculate TAM/SAM/SOM for a market',
      parameters: {
        type: 'object',
        properties: {
          market: { type: 'string' },
          geography: { type: 'string' },
          segments: { type: 'array', items: { type: 'string' } }
        },
        required: ['market']
      }
    }
  }
];
```

### 2. Handle Function Calls

```typescript
async function handleDealAnalysisWithFunctions(dealData: any) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: `Analyze this deal: ${JSON.stringify(dealData)}`,
    tools: [...customTools, { type: 'web_search' }],
    tool_choice: 'auto',
  });

  // Process function calls in the response
  for (const item of response.output) {
    if (item.type === 'function_call') {
      const result = await executeFunction(
        item.function.name,
        item.function.arguments
      );
      
      // Continue conversation with function results
      const followUp = await openai.responses.create({
        model: 'gpt-4.1',
        input: `Function ${item.function.name} returned: ${JSON.stringify(result)}`,
        previous_response_id: response.id,
      });
    }
  }
}

async function executeFunction(name: string, args: any) {
  switch (name) {
    case 'search_portfolio_companies':
      return await searchPortfolio(args);
    case 'calculate_market_size':
      return await calculateMarket(args);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
```

---

## Streaming Responses

### 1. Enable Streaming

```typescript
async function streamAnalysis(input: string) {
  const stream = await openai.responses.create({
    model: 'gpt-4.1',
    input: input,
    stream: true,
  });

  for await (const event of stream) {
    switch (event.type) {
      case 'response.created':
        console.log('Analysis started:', event.response.id);
        break;
      
      case 'response.output_item.added':
        console.log('New output item:', event.item);
        break;
      
      case 'response.text.delta':
        // Stream text to UI
        process.stdout.write(event.text);
        break;
      
      case 'response.function_call.arguments.delta':
        // Handle streaming function arguments
        console.log('Function args:', event.delta);
        break;
      
      case 'response.completed':
        console.log('Analysis complete');
        break;
    }
  }
}
```

### 2. Stream to Frontend via Server-Sent Events

```typescript
// Next.js API Route
export async function POST(req: Request) {
  const { input } = await req.json();
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await openai.responses.create({
        model: 'gpt-4.1',
        input: input,
        stream: true,
      });

      for await (const event of response) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## Background Processing

### 1. Long-Running Analysis

```typescript
async function startBackgroundAnalysis(dealId: string, documents: any[]) {
  // Start analysis in background
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: {
      dealId,
      documents,
      task: 'comprehensive_due_diligence'
    },
    background: true,
    tools: ['web_search', 'file_search'],
    metadata: {
      dealId: dealId,
      type: 'full_analysis'
    }
  });

  // Store job ID for tracking
  await saveAnalysisJob(dealId, response.id);

  return {
    jobId: response.id,
    status: 'processing',
    estimatedTime: '5-10 minutes'
  };
}

// Check status later
async function checkAnalysisStatus(jobId: string) {
  const response = await openai.responses.retrieve(jobId);
  
  if (response.status === 'completed') {
    return {
      status: 'completed',
      results: response.output,
      usage: response.usage
    };
  } else if (response.status === 'failed') {
    return {
      status: 'failed',
      error: response.error
    };
  } else {
    return {
      status: response.status,
      progress: response.metadata?.progress || 'in_progress'
    };
  }
}
```

---

## Error Handling and Retry Logic

```typescript
class ResponsesAPIClient {
  private maxRetries = 3;
  private retryDelay = 1000;

  async createResponseWithRetry(params: any): Promise<any> {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await openai.responses.create(params);
      } catch (error: any) {
        lastError = error;
        
        // Handle specific error types
        if (error.status === 429) {
          // Rate limit - wait longer
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        } else if (error.status === 503) {
          // Service unavailable - retry
          await this.delay(this.retryDelay);
        } else if (error.status >= 400 && error.status < 500) {
          // Client error - don't retry
          throw error;
        }
        
        console.log(`Attempt ${attempt + 1} failed:`, error.message);
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Supabase Edge Function Implementation

```typescript
// supabase/functions/analyze-deal-v2/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://deno.land/x/openai@v4.20.1/mod.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  try {
    const { dealId, documents, analysisType } = await req.json();
    
    // Build multi-modal input
    const input = await buildAnalysisInput(documents);
    
    // Create response with tools
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: input,
      instructions: ANALYSIS_INSTRUCTIONS[analysisType],
      tools: [
        { type: 'web_search' },
        { type: 'code_interpreter' }
      ],
      include: [
        'web_search_call.results',
        'code_interpreter_call.outputs'
      ],
      metadata: { dealId, analysisType },
      store: true,
    });

    // Store results
    await storeAnalysisResults(dealId, response);

    return new Response(
      JSON.stringify({
        success: true,
        analysisId: response.id,
        summary: extractSummary(response),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analysis failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function buildAnalysisInput(documents: any[]) {
  const input = [];
  
  for (const doc of documents) {
    if (doc.type === 'text') {
      input.push({
        type: 'input_text',
        text: doc.content
      });
    } else if (doc.type === 'image') {
      input.push({
        type: 'input_image',
        image_url: { url: doc.url }
      });
    }
  }
  
  return input;
}
```

---

## Performance Optimization

### 1. Request Batching
```typescript
class BatchedResponsesClient {
  private queue: Array<{params: any, resolve: Function, reject: Function}> = [];
  private processing = false;

  async createResponse(params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ params, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, 5); // Process up to 5 at once
    
    try {
      const promises = batch.map(item => 
        openai.responses.create(item.params)
          .then(res => item.resolve(res))
          .catch(err => item.reject(err))
      );
      
      await Promise.all(promises);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
}
```

### 2. Response Caching
```typescript
class CachedResponsesClient {
  private cache = new Map<string, any>();
  private cacheExpiry = 3600000; // 1 hour

  async createResponse(params: any, cacheKey?: string): Promise<any> {
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.response;
      }
    }

    const response = await openai.responses.create(params);
    
    if (cacheKey) {
      this.cache.set(cacheKey, {
        response,
        expiry: Date.now() + this.cacheExpiry
      });
    }

    return response;
  }
}
```

---

## Cost Management

### 1. Token Usage Tracking
```typescript
interface TokenUsageTracker {
  dealId: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  toolTokens: number;
  estimatedCost: number;
}

async function trackTokenUsage(response: any, dealId: string) {
  const usage = response.usage;
  const costPerMillion = {
    'gpt-4.1': { input: 2.5, output: 10 },
    'gpt-4.1-mini': { input: 0.15, output: 0.6 }
  };

  const model = response.model;
  const costs = costPerMillion[model] || costPerMillion['gpt-4.1'];
  
  const estimatedCost = (
    (usage.input_tokens / 1_000_000) * costs.input +
    (usage.output_tokens / 1_000_000) * costs.output
  );

  await saveTokenUsage({
    dealId,
    totalTokens: usage.total_tokens,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    toolTokens: usage.input_tokens_details?.tool_tokens || 0,
    estimatedCost
  });
}
```

### 2. Model Selection Strategy
```typescript
async function selectOptimalModel(task: string, contextSize: number) {
  // Use smaller models for simple tasks
  if (task === 'extraction' && contextSize < 4000) {
    return 'gpt-4.1-mini';
  }
  
  // Use larger model for complex analysis
  if (task === 'comprehensive_analysis' || contextSize > 32000) {
    return 'gpt-4.1';
  }
  
  // Default to mini for cost efficiency
  return 'gpt-4.1-mini';
}
```

---

## Migration Timeline

### Phase 1: Update Core Infrastructure (Week 1)
- [ ] Update OpenAI SDK to latest version
- [ ] Create Responses API wrapper service
- [ ] Update environment variables and API keys
- [ ] Set up error handling and retry logic

### Phase 2: Migrate Deal Analysis (Week 2)
- [ ] Convert document analysis to Responses API
- [ ] Implement web search for market research
- [ ] Add stateful conversation support
- [ ] Update prompt templates

### Phase 3: Migrate Memo Generation (Week 3)
- [ ] Convert memo generation to use previous_response_id
- [ ] Implement file search for knowledge base
- [ ] Add streaming support for real-time generation
- [ ] Update export functionality

### Phase 4: Testing and Optimization (Week 4)
- [ ] Load test new endpoints
- [ ] Optimize token usage
- [ ] Implement caching strategy
- [ ] Monitor and adjust rate limits

---

## Best Practices

1. **Always store responses** for conversation continuity
2. **Use appropriate tools** - don't recreate what's built-in
3. **Handle streaming properly** for better UX
4. **Track token usage** for cost management
5. **Implement proper error handling** with retries
6. **Use background processing** for long tasks
7. **Cache responses** where appropriate
8. **Monitor rate limits** and implement queuing

---

## Security Considerations

1. **Never expose response IDs** to untrusted clients
2. **Validate all inputs** before sending to API
3. **Implement access controls** for stored responses
4. **Sanitize outputs** before displaying to users
5. **Log all API calls** for audit trails
6. **Encrypt sensitive data** in metadata
7. **Use separate API keys** for different environments

This migration to the Responses API will provide HTV with a more powerful, flexible, and maintainable AI integration that can grow with the platform's needs.