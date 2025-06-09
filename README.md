# HTV Operating System

Venture Capital Operating System for Home Technology Ventures.

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- Supabase CLI
- Supabase project created

### 2. Environment Setup
Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```

### 3. Database Setup

Run the following Supabase CLI command to create a new migration:
```bash
supabase migration new initial_schema
```

Then copy the contents of `supabase/migrations/001_initial_schema.sql` into the generated migration file and run:
```bash
supabase db push
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```

## Supabase Edge Functions

The following Edge Functions need to be deployed:

1. **process-document** - Handles document processing and embedding generation
2. **analyze-deal** - Performs AI analysis on deals
3. **generate-memo** - Generates investment memos

To create each function:
```bash
supabase functions new [function-name]
```

Then deploy:
```bash
supabase functions deploy [function-name]
```

## Architecture Overview

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **AI**: OpenAI Responses API (GPT-4.1)
- **State Management**: Zustand + SWR
- **File Storage**: Supabase Storage

## Key Features

1. **Deal Screener**: Quick analysis of pitch decks with AI
2. **Memo Generator**: Generate professional investment memos
3. **Pipeline Management**: Track deals through investment stages
4. **Document Processing**: Extract and analyze documents with RAG
5. **Knowledge Base**: Store and search industry content