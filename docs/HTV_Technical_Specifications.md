# HTV VC Operating System - Technical Specifications

## 1. System Architecture Overview

### 1.1 High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   Vercel Edge    │────▶│    Supabase     │
│   (Frontend)    │     │    Functions     │     │   (Backend)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Vercel CDN     │     │   OpenAI API     │     │   PostgreSQL    │
│  (Static Assets)│     │   (GPT-4.1)      │     │   + pgvector    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 1.2 Technology Stack Details

#### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.3+
- **UI Library**: React 18.2+
- **Styling**: Tailwind CSS 3.4+ with Shadcn/ui components
- **State Management**: Zustand for client state, SWR for server state
- **Forms**: React Hook Form with Zod validation
- **Rich Text**: TipTap editor for memo editing
- **File Upload**: react-dropzone with Supabase direct upload

#### Backend
- **Platform**: Supabase (PostgreSQL 15+)
- **Edge Functions**: Deno runtime
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage (S3 compatible)
- **Vector Database**: pgvector extension
- **Background Jobs**: Supabase Edge Functions with pg_cron
- **Real-time**: Supabase Realtime for live updates

#### AI/ML
- **Primary Model**: OpenAI GPT-4.1 (128K context)
- **Embeddings**: text-embedding-3-large
- **Vision**: GPT-4.1 multimodal for charts/images
- **Function Calling**: OpenAI function calling API
- **Rate Limiting**: Token bucket algorithm

---

## 2. Database Schema

### 2.1 Core Tables

```sql
-- Organizations (for future multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb
);

-- Users (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES organizations(id),
    role TEXT CHECK (role IN ('admin', 'partner', 'analyst')),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sectors/Verticals
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES sectors(id),
    description TEXT,
    keywords TEXT[]
);

-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    website TEXT,
    sector_id UUID REFERENCES sectors(id),
    description TEXT,
    founded_year INTEGER,
    location JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    stage TEXT CHECK (stage IN ('sourced', 'screening', 'deep_dive', 'partner_review', 'term_sheet', 'closed', 'passed')),
    source TEXT,
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    processed BOOLEAN DEFAULT FALSE,
    processing_status TEXT,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Chunks (for RAG)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072), -- for text-embedding-3-large
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal Analyses
CREATE TABLE deal_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    analysis_type TEXT CHECK (analysis_type IN ('quick', 'standard', 'deep')),
    summary TEXT,
    team_analysis TEXT,
    market_analysis TEXT,
    product_analysis TEXT,
    competition_analysis TEXT,
    risks_analysis JSONB,
    metrics JSONB,
    raw_output JSONB,
    model_used TEXT,
    tokens_used INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment Memos
CREATE TABLE investment_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES deal_analyses(id),
    version INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    sections JSONB,
    status TEXT CHECK (status IN ('draft', 'review', 'final')),
    ai_confidence_score FLOAT,
    edit_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    last_edited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES auth.users(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base Articles
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    article_type TEXT CHECK (article_type IN ('research', 'news', 'report', 'analysis')),
    sector_ids UUID[],
    tags TEXT[],
    published_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article Chunks (for RAG)
CREATE TABLE article_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Indexes and Performance

```sql
-- Performance indexes
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_documents_deal ON documents(deal_id);
CREATE INDEX idx_documents_processed ON documents(processed);
CREATE INDEX idx_analyses_deal ON deal_analyses(deal_id);
CREATE INDEX idx_memos_deal ON investment_memos(deal_id);

-- Vector similarity search indexes
CREATE INDEX idx_doc_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_article_chunks_embedding ON article_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full text search
CREATE INDEX idx_companies_search ON companies 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_articles_search ON knowledge_articles 
USING gin(to_tsvector('english', title || ' ' || content));
```

---

## 3. API Specifications

### 3.1 RESTful Endpoints

#### Authentication
```typescript
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

#### Deals
```typescript
GET    /api/deals                    // List with filters
POST   /api/deals                    // Create new deal
GET    /api/deals/:id               // Get deal details
PUT    /api/deals/:id               // Update deal
DELETE /api/deals/:id               // Delete deal
PUT    /api/deals/:id/stage         // Update stage
```

#### Documents
```typescript
POST   /api/deals/:dealId/documents/upload   // Upload document
GET    /api/deals/:dealId/documents          // List documents
GET    /api/documents/:id                    // Get document
DELETE /api/documents/:id                    // Delete document
POST   /api/documents/:id/reprocess          // Reprocess document
```

#### Analysis
```typescript
POST   /api/deals/:dealId/analyze    // Trigger analysis
GET    /api/deals/:dealId/analyses   // List analyses
GET    /api/analyses/:id             // Get analysis
POST   /api/analyses/:id/regenerate  // Regenerate section
```

#### Memos
```typescript
POST   /api/deals/:dealId/memos      // Generate memo
GET    /api/deals/:dealId/memos      // List memos
GET    /api/memos/:id                // Get memo
PUT    /api/memos/:id                // Update memo
POST   /api/memos/:id/export         // Export (PDF/Word)
```

#### Knowledge Base
```typescript
GET    /api/knowledge/search         // Search articles
POST   /api/knowledge/articles       // Add article
GET    /api/knowledge/articles/:id   // Get article
PUT    /api/knowledge/articles/:id   // Update article
DELETE /api/knowledge/articles/:id   // Delete article
```

### 3.2 Supabase Edge Functions

#### Document Processing Function
```typescript
// /supabase/functions/process-document/index.ts
interface ProcessDocumentRequest {
  documentId: string
  dealId: string
  fileType: string
  storagePath: string
}

interface ProcessDocumentResponse {
  success: boolean
  extractedText?: string
  chunks?: Array<{
    content: string
    embedding: number[]
    metadata: Record<string, any>
  }>
  error?: string
}
```

#### Deal Analysis Function
```typescript
// /supabase/functions/analyze-deal/index.ts
interface AnalyzeDealRequest {
  dealId: string
  analysisType: 'quick' | 'standard' | 'deep'
  includeVisuals: boolean
  sections?: string[]
}

interface AnalyzeDealResponse {
  analysisId: string
  status: 'processing' | 'completed' | 'failed'
  estimatedTime?: number
  results?: {
    summary: string
    teamAnalysis: string
    marketAnalysis: string
    productAnalysis: string
    competitionAnalysis: string
    risks: {
      market: string[]
      operational: string[]
      financial: string[]
    }
  }
}
```

---

## 4. AI Integration Specifications

### 4.1 GPT-4.1 Integration

#### Long Context Processing
```typescript
interface LongContextRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{
      type: 'text' | 'image_url'
      text?: string
      image_url?: { url: string }
    }>
  }>
  model: 'gpt-4-turbo-preview'
  max_tokens: number
  temperature: number
  functions?: FunctionDefinition[]
}
```

#### Function Definitions
```typescript
const functions: FunctionDefinition[] = [
  {
    name: "search_knowledge_base",
    description: "Search internal knowledge base for relevant information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        filters: {
          type: "object",
          properties: {
            sector: { type: "string" },
            dateRange: { type: "string" },
            documentType: { type: "string" }
          }
        }
      },
      required: ["query"]
    }
  },
  {
    name: "lookup_company_data",
    description: "Get detailed information about a company",
    parameters: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        dataTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["financials", "team", "funding", "competitors"]
          }
        }
      },
      required: ["companyName"]
    }
  },
  {
    name: "calculate_metrics",
    description: "Calculate financial or growth metrics",
    parameters: {
      type: "object",
      properties: {
        metricType: {
          type: "string",
          enum: ["growth_rate", "burn_rate", "runway", "market_share"]
        },
        data: { type: "object" }
      },
      required: ["metricType", "data"]
    }
  }
]
```

### 4.2 Prompt Templates

#### Deal Analysis Prompt
```typescript
const DEAL_ANALYSIS_PROMPT = `You are an expert venture capital analyst. Analyze the provided startup information and create a comprehensive due diligence report.

Company: {companyName}
Documents: {documentSummaries}
Visual Data: {chartAnalyses}
Market Context: {marketResearch}

Generate a structured analysis covering:
1. Executive Summary (2-3 paragraphs)
2. Team Assessment
   - Founder backgrounds and expertise
   - Team completeness and gaps
   - Relevant experience
3. Market Opportunity
   - Market size and growth rate
   - Key trends and tailwinds
   - Target customer segments
4. Product/Technology
   - Core value proposition
   - Technical differentiation
   - Product-market fit indicators
5. Business Model
   - Revenue model
   - Unit economics
   - Scalability
6. Competition
   - Direct competitors
   - Competitive advantages
   - Market positioning
7. Risks and Mitigation
   - Market risks
   - Operational risks
   - Financial risks
8. Traction and Metrics
   - Current performance
   - Growth trajectory
   - Key milestones

Use specific data points from the provided information. If data is missing, note it explicitly.`;
```

#### Memo Generation Prompt
```typescript
const MEMO_GENERATION_PROMPT = `You are writing an investment memo for Home Technology Ventures. Create a professional 5-7 page investment memo based on the following analysis:

{dealAnalysis}

Additional Context:
- Investment Stage: {stage}
- Proposed Investment: {amount}
- Target Ownership: {ownership}

Format the memo with these sections:
1. Investment Recommendation (1 paragraph)
2. Company Overview
3. Investment Thesis
4. Market Opportunity
5. Product & Technology
6. Business Model & Unit Economics
7. Team
8. Competition
9. Risks & Mitigation Strategies
10. Financial Projections
11. Exit Scenarios
12. Terms & Structure

Style Guidelines:
- Professional, objective tone
- Data-driven arguments
- Clear, concise writing
- Highlight both opportunities and risks
- Include specific metrics and examples`;
```

---

## 5. Security Specifications

### 5.1 Authentication & Authorization

#### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string          // User ID
  email: string
  role: 'admin' | 'partner' | 'analyst'
  org_id: string       // Organization ID
  permissions: string[]
  exp: number          // Expiration
  iat: number          // Issued at
}
```

#### Row Level Security Policies
```sql
-- Deals RLS
CREATE POLICY "Users can view deals in their org" ON deals
    FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "Users can create deals in their org" ON deals
    FOR INSERT WITH CHECK (org_id = auth.jwt() ->> 'org_id');

-- Documents RLS
CREATE POLICY "Users can view documents for their org's deals" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = documents.deal_id 
            AND deals.org_id = auth.jwt() ->> 'org_id'
        )
    );
```

### 5.2 API Security

#### Rate Limiting
```typescript
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: {
    standard: 100,          // Standard endpoints
    upload: 10,            // File uploads
    ai: 20,               // AI generation
    export: 5             // Exports
  }
};
```

#### Input Validation
```typescript
// Zod schemas for validation
const DealCreateSchema = z.object({
  companyName: z.string().min(1).max(200),
  stage: z.enum(['sourced', 'screening', 'deep_dive', 'partner_review', 'term_sheet']),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const DocumentUploadSchema = z.object({
  dealId: z.string().uuid(),
  files: z.array(z.object({
    filename: z.string(),
    mimeType: z.enum(['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    size: z.number().max(50 * 1024 * 1024) // 50MB max
  }))
});
```

---

## 6. Performance Specifications

### 6.1 Response Time Targets
- Page Load: < 2 seconds (P95)
- API Endpoints: < 500ms (P95)
- Document Upload: < 5 seconds for 10MB
- AI Analysis: < 60 seconds for standard analysis
- Memo Generation: < 30 seconds

### 6.2 Scalability Requirements
- Concurrent Users: 50-100 (MVP)
- Documents/Day: 200-500
- Storage: 1TB initial capacity
- Database Connections: 100 max
- API Rate Limits: 10,000 requests/hour

### 6.3 Caching Strategy
```typescript
// Redis cache configuration
const cacheConfig = {
  dealAnalysis: {
    ttl: 3600,        // 1 hour
    key: 'analysis:{dealId}:{version}'
  },
  companyData: {
    ttl: 86400,       // 24 hours
    key: 'company:{companyId}'
  },
  searchResults: {
    ttl: 300,         // 5 minutes
    key: 'search:{hash}'
  }
};
```

---

## 7. Integration Specifications

### 7.1 Third-Party APIs

#### OpenAI Configuration
```typescript
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  defaultModel: 'gpt-4-turbo-preview',
  embeddingModel: 'text-embedding-3-large',
  maxRetries: 3,
  timeout: 120000, // 2 minutes
  rateLimit: {
    requestsPerMinute: 500,
    tokensPerMinute: 150000
  }
};
```

#### Proxycurl Integration
```typescript
interface ProxycurlRequest {
  linkedin_profile_url: string
  use_cache?: 'if-present' | 'if-recent'
  fallback_to_cache?: 'on-error' | 'never'
}

interface ProxycurlResponse {
  full_name: string
  occupation: string
  summary: string
  experiences: Array<{
    company: string
    title: string
    duration: string
  }>
  education: Array<{
    school: string
    degree: string
    field: string
  }>
}
```

### 7.2 Webhook Specifications

#### Document Processing Webhook
```typescript
interface DocumentProcessingWebhook {
  event: 'document.processing.complete' | 'document.processing.failed'
  documentId: string
  dealId: string
  status: 'success' | 'failed'
  results?: {
    pageCount: number
    wordCount: number
    extractedEntities: string[]
    confidence: number
  }
  error?: string
  timestamp: string
}
```

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track
```typescript
const metrics = {
  business: {
    dealsCreated: 'counter',
    analysesGenerated: 'counter',
    memosCreated: 'counter',
    documentsProcessed: 'counter',
    activeUsers: 'gauge'
  },
  technical: {
    apiLatency: 'histogram',
    errorRate: 'gauge',
    dbConnections: 'gauge',
    queueDepth: 'gauge',
    aiTokensUsed: 'counter'
  },
  ai: {
    analysisAccuracy: 'gauge',
    memoEditRate: 'gauge',
    processingTime: 'histogram',
    costPerAnalysis: 'gauge'
  }
};
```

### 8.2 Logging Standards
```typescript
interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  userId?: string
  dealId?: string
  action: string
  metadata: Record<string, any>
  duration?: number
  error?: {
    message: string
    stack?: string
    code?: string
  }
}
```

---

This technical specification provides the detailed blueprint for implementing the HTV VC Operating System MVP, ensuring all components work together seamlessly while maintaining security, performance, and scalability.