# HTV VC Operating System - API Endpoint Specifications

## Overview

This document provides detailed API specifications for all endpoints in the HTV VC Operating System. All endpoints use JSON for request/response bodies and require authentication unless specified.

### Base URL
- Development: `https://htv-dev.vercel.app/api`
- Production: `https://api.htv.vc`

### Authentication
All requests require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Common Response Format
```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": string,
    "message": string,
    "details": object
  } | null,
  "meta": {
    "timestamp": string,
    "version": string,
    "requestId": string
  }
}
```

---

## Authentication Endpoints

### POST /auth/login
Authenticate user and receive access tokens.

**Request:**
```json
{
  "email": "analyst@htv.vc",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "analyst@htv.vc",
      "role": "analyst",
      "orgId": "660e8400-e29b-41d4-a716-446655440000"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

---

## Deal Management Endpoints

### GET /deals
List all deals with optional filters and pagination.

**Query Parameters:**
- `page` (number): Page number, default 1
- `limit` (number): Items per page, default 20
- `stage` (string): Filter by stage
- `assignedTo` (uuid): Filter by assigned user
- `search` (string): Search in company names
- `sortBy` (string): Sort field (createdAt, updatedAt, companyName)
- `sortOrder` (string): asc or desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "companyName": "PropertyTech Inc",
      "stage": "deep_dive",
      "source": "warm_intro",
      "assignedTo": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Analyst"
      },
      "company": {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "name": "PropertyTech Inc",
        "website": "https://propertytech.com",
        "sector": "PropTech"
      },
      "lastActivity": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T09:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### POST /deals
Create a new deal.

**Request:**
```json
{
  "companyName": "SmartHome AI",
  "companyWebsite": "https://smarthome-ai.com",
  "stage": "sourced",
  "source": "conference",
  "assignedTo": "550e8400-e29b-41d4-a716-446655440000",
  "sector": "PropTech",
  "metadata": {
    "conferenceNName": "PropTech Summit 2024",
    "initialNotes": "Met founder at booth, strong technical team"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "companyName": "SmartHome AI",
    "companyId": "aa0e8400-e29b-41d4-a716-446655440000",
    "stage": "sourced",
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

### PUT /deals/:id/stage
Update deal pipeline stage.

**Request:**
```json
{
  "stage": "deep_dive",
  "notes": "Passed initial screening, moving to detailed analysis"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "previousStage": "screening",
    "currentStage": "deep_dive",
    "updatedAt": "2024-01-20T15:00:00Z"
  }
}
```

---

## Document Management Endpoints

### POST /deals/:dealId/documents/upload
Upload documents for a deal. Supports multipart/form-data.

**Request (multipart/form-data):**
```
POST /deals/770e8400-e29b-41d4-a716-446655440000/documents/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="files"; filename="pitch_deck.pdf"
Content-Type: application/pdf

[PDF binary data]
------WebKitFormBoundary
Content-Disposition: form-data; name="files"; filename="financials.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

[Excel binary data]
------WebKitFormBoundary--
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440000",
        "filename": "pitch_deck.pdf",
        "fileSize": 2548576,
        "status": "processing"
      },
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440000",
        "filename": "financials.xlsx",
        "fileSize": 156432,
        "status": "processing"
      }
    ],
    "processingJobId": "job_dd0e8400-e29b-41d4-a716"
  }
}
```

### GET /documents/:id/status
Check document processing status.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "filename": "pitch_deck.pdf",
    "status": "completed",
    "processedAt": "2024-01-20T15:05:00Z",
    "results": {
      "pageCount": 15,
      "wordCount": 3500,
      "extractedSections": [
        "Executive Summary",
        "Problem",
        "Solution",
        "Market",
        "Business Model",
        "Team",
        "Financials"
      ],
      "hasCharts": true,
      "chartCount": 5
    }
  }
}
```

---

## Analysis Endpoints

### POST /deals/:dealId/analyze
Trigger AI analysis for a deal.

**Request:**
```json
{
  "analysisType": "standard",
  "includeVisuals": true,
  "sections": [
    "team",
    "market",
    "product",
    "competition",
    "risks"
  ],
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
    "analysisId": "ee0e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "estimatedCompletionTime": 45,
    "webhookUrl": "https://htv-dev.vercel.app/api/webhooks/analysis/ee0e8400"
  }
}
```

### GET /analyses/:id
Retrieve completed analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440000",
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "completedAt": "2024-01-20T15:10:00Z",
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
        "som": "$150M"
      },
      "competitionAnalysis": {
        "directCompetitors": [
          {
            "name": "CompetitorA",
            "strengths": ["Market share", "Brand"],
            "weaknesses": ["Legacy tech", "Poor UX"]
          }
        ],
        "competitiveAdvantage": "AI-powered automation and modern UX",
        "marketPositioning": "Premium solution for mid-market property managers"
      },
      "risks": {
        "market": [
          {
            "risk": "Market consolidation",
            "impact": "medium",
            "mitigation": "Focus on differentiation"
          }
        ],
        "operational": [
          {
            "risk": "Scaling customer success",
            "impact": "high",
            "mitigation": "Invest in CS team early"
          }
        ],
        "financial": [
          {
            "risk": "High CAC",
            "impact": "medium",
            "mitigation": "Improve product-led growth"
          }
        ]
      }
    },
    "metadata": {
      "modelUsed": "gpt-4-turbo-preview",
      "tokensUsed": 45000,
      "confidence": 0.85,
      "dataSources": ["pitch_deck", "website", "linkedin", "market_research"]
    }
  }
}
```

### POST /analyses/:id/feedback
Submit feedback on analysis quality.

**Request:**
```json
{
  "rating": 4,
  "sections": {
    "team": { "accurate": true, "helpful": true },
    "market": { "accurate": false, "notes": "Market size seems overestimated" }
  },
  "overallNotes": "Good analysis but needs more competitor detail"
}
```

---

## Memo Generation Endpoints

### POST /deals/:dealId/memos
Generate investment memo from analysis.

**Request:**
```json
{
  "analysisId": "ee0e8400-e29b-41d4-a716-446655440000",
  "template": "standard",
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
  "additionalGuidance": "Emphasize the AI differentiation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memoId": "ff0e8400-e29b-41d4-a716-446655440000",
    "status": "generating",
    "estimatedTime": 30
  }
}
```

### GET /memos/:id
Retrieve generated memo.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ff0e8400-e29b-41d4-a716-446655440000",
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "title": "Investment Memo: PropertyTech Inc",
    "status": "draft",
    "content": "# Investment Memo: PropertyTech Inc\n\n## Executive Summary\n\nPropertyTech Inc represents a compelling investment opportunity...",
    "sections": {
      "executive_summary": "PropertyTech Inc represents a compelling investment opportunity...",
      "investment_thesis": "We believe PropertyTech can capture significant market share...",
      "market_opportunity": "The property management software market is experiencing..."
    },
    "metadata": {
      "wordCount": 2500,
      "generatedAt": "2024-01-20T15:20:00Z",
      "lastEditedAt": "2024-01-20T16:00:00Z",
      "editCount": 3,
      "aiConfidence": 0.88
    }
  }
}
```

### PUT /memos/:id
Update memo content.

**Request:**
```json
{
  "content": "# Investment Memo: PropertyTech Inc\n\n[Updated content...]",
  "sections": {
    "executive_summary": "[Updated summary...]"
  },
  "status": "review"
}
```

### POST /memos/:id/export
Export memo to PDF or Word.

**Request:**
```json
{
  "format": "pdf",
  "includeAppendix": true,
  "watermark": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://htv-storage.supabase.co/memos/exports/ff0e8400.pdf",
    "expiresAt": "2024-01-20T17:00:00Z",
    "fileSize": 458000
  }
}
```

---

## Knowledge Base Endpoints

### POST /knowledge/search
Search knowledge base using semantic search.

**Request:**
```json
{
  "query": "proptech market trends 2024",
  "filters": {
    "sectors": ["PropTech"],
    "dateRange": {
      "start": "2023-01-01",
      "end": "2024-12-31"
    },
    "sources": ["research", "news"]
  },
  "limit": 10,
  "includeEmbeddings": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "110e8400-e29b-41d4-a716-446655440000",
        "title": "PropTech Market Analysis 2024",
        "excerpt": "The PropTech market is expected to grow at 18% CAGR...",
        "source": "Industry Report",
        "relevanceScore": 0.92,
        "publishedDate": "2024-01-05",
        "highlights": [
          "PropTech market is expected to grow at <mark>18% CAGR</mark>",
          "AI adoption is driving <mark>market trends 2024</mark>"
        ]
      }
    ],
    "totalResults": 25,
    "searchMetadata": {
      "queryEmbedding": "[1536-dimensional vector]",
      "processingTime": 150
    }
  }
}
```

### POST /knowledge/articles
Add article to knowledge base.

**Request:**
```json
{
  "title": "AI Revolution in Real Estate",
  "content": "Full article content...",
  "sourceUrl": "https://techcrunch.com/2024/01/ai-real-estate",
  "articleType": "news",
  "sectors": ["PropTech", "AI"],
  "tags": ["artificial_intelligence", "automation", "property_management"],
  "publishedDate": "2024-01-15"
}
```

---

## Company Directory Endpoints

### GET /companies
List companies with filters.

**Query Parameters:**
- `sector` (string): Filter by sector
- `search` (string): Search in name/description
- `fundingStage` (string): Filter by funding stage
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "220e8400-e29b-41d4-a716-446655440000",
      "name": "SmartLock Technologies",
      "website": "https://smartlock.tech",
      "sector": "PropTech",
      "subSector": "IoT",
      "description": "IoT-enabled smart lock solutions for property managers",
      "fundingStage": "Series A",
      "lastFunding": {
        "amount": "$15M",
        "date": "2023-09-15",
        "investors": ["VC Firm A", "Angel B"]
      },
      "founded": 2021,
      "employeeCount": "25-50",
      "tags": ["iot", "security", "property_management"]
    }
  ]
}
```

### POST /companies/:id/competitors
Find competitors for a company.

**Request:**
```json
{
  "analysisDepth": "detailed",
  "maxResults": 10,
  "includeIndirect": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "directCompetitors": [
      {
        "id": "330e8400-e29b-41d4-a716-446655440000",
        "name": "SecureDoor Inc",
        "similarity": 0.89,
        "competitiveFactors": {
          "market": "same",
          "technology": "similar",
          "businessModel": "identical",
          "geography": "overlapping"
        }
      }
    ],
    "indirectCompetitors": [
      {
        "id": "440e8400-e29b-41d4-a716-446655440000",
        "name": "Traditional Lock Co",
        "similarity": 0.45,
        "competitiveFactors": {
          "market": "adjacent",
          "technology": "different",
          "businessModel": "traditional"
        }
      }
    ]
  }
}
```

---

## Webhook Endpoints

### Analysis Complete Webhook
Sent when an analysis is completed.

**Webhook Payload:**
```json
{
  "event": "analysis.completed",
  "timestamp": "2024-01-20T15:10:00Z",
  "data": {
    "analysisId": "ee0e8400-e29b-41d4-a716-446655440000",
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "success",
    "completionTime": 42,
    "summary": {
      "overallScore": 8.2,
      "recommendation": "proceed",
      "keyStrengths": ["Strong team", "Large market"],
      "keyRisks": ["Competition", "Execution risk"]
    }
  }
}
```

### Document Processing Webhook
Sent when document processing is complete.

**Webhook Payload:**
```json
{
  "event": "document.processed",
  "timestamp": "2024-01-20T15:05:00Z",
  "data": {
    "documentId": "bb0e8400-e29b-41d4-a716-446655440000",
    "dealId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "success",
    "results": {
      "textExtracted": true,
      "chartsProcessed": 5,
      "entitiesFound": ["PropertyTech Inc", "Jane Smith", "$15M"],
      "keyMetrics": {
        "revenue": "$2.5M ARR",
        "growth": "150% YoY",
        "customers": 125
      }
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "stage",
      "reason": "Invalid stage value. Must be one of: sourced, screening, deep_dive, partner_review, term_sheet"
    }
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "reason": "Invalid or expired token"
    }
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied",
    "details": {
      "reason": "Insufficient permissions for this operation",
      "requiredRole": "admin",
      "userRole": "analyst"
    }
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "resource": "deal",
      "id": "999e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### 429 Rate Limit Exceeded
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "window": "15m",
      "retryAfter": 300
    }
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "requestId": "req_550e8400-e29b-41d4",
      "timestamp": "2024-01-20T15:00:00Z"
    }
  }
}
```

---

## Rate Limiting

Different endpoints have different rate limits:

| Endpoint Category | Requests per 15 min | Burst Limit |
|------------------|---------------------|-------------|
| Authentication   | 10                  | 5           |
| Read Operations  | 1000                | 100         |
| Write Operations | 100                 | 20          |
| AI Operations    | 20                  | 5           |
| File Uploads     | 10                  | 3           |
| Exports          | 5                   | 2           |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642752000
```

---

## SDK Usage Examples

### TypeScript/JavaScript
```typescript
import { HTVClient } from '@htv/sdk';

const client = new HTVClient({
  apiKey: process.env.HTV_API_KEY,
  environment: 'production'
});

// Create a deal
const deal = await client.deals.create({
  companyName: 'SmartHome AI',
  stage: 'sourced',
  source: 'conference'
});

// Upload documents
const documents = await client.documents.upload(deal.id, [
  { file: pitchDeckFile, type: 'pitch_deck' },
  { file: financialsFile, type: 'financials' }
]);

// Trigger analysis
const analysis = await client.analyses.create(deal.id, {
  analysisType: 'standard',
  includeVisuals: true
});

// Wait for completion
await client.analyses.waitForCompletion(analysis.id);

// Generate memo
const memo = await client.memos.generate(deal.id, {
  analysisId: analysis.id,
  template: 'standard'
});
```

### Python
```python
from htv import HTVClient

client = HTVClient(
    api_key=os.environ["HTV_API_KEY"],
    environment="production"
)

# Create a deal
deal = client.deals.create(
    company_name="SmartHome AI",
    stage="sourced",
    source="conference"
)

# Upload documents
documents = client.documents.upload(
    deal_id=deal.id,
    files=[
        ("pitch_deck.pdf", pitch_deck_bytes),
        ("financials.xlsx", financials_bytes)
    ]
)

# Trigger analysis
analysis = client.analyses.create(
    deal_id=deal.id,
    analysis_type="standard",
    include_visuals=True
)

# Generate memo
memo = client.memos.generate(
    deal_id=deal.id,
    analysis_id=analysis.id,
    template="standard"
)
```

---

This API specification provides comprehensive documentation for all endpoints, request/response formats, error handling, and usage examples to ensure smooth implementation and integration of the HTV VC Operating System.