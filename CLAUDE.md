# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTV VC Operating System - A Next.js 14 application for venture capital deal flow management with AI-powered analysis and document processing.

## Commands

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Build for production
npm run start      # Start production server
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
```

### Database
```bash
npx supabase db reset     # Reset database with migrations
npx supabase db push      # Push schema changes
npx supabase functions serve  # Run edge functions locally
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL + pgvector), Edge Functions (Deno)
- **AI**: OpenAI GPT-4.1 (128K), text-embedding-3-large
- **Auth**: Supabase Auth with JWT

### Key Directories
- `/app` - Next.js pages and API routes using App Router
- `/components` - React components following shadcn/ui pattern
- `/lib` - Utilities including Supabase client setup
- `/supabase` - Database migrations and edge functions
- `/types` - TypeScript definitions matching database schema

### Database Schema
Multi-tenant architecture with:
- Organizations and user roles (admin, partner, analyst)
- Deal pipeline stages: thesis_fit → signals → validation → conviction → term_sheet → due_diligence → closed
- Document storage with vector embeddings for RAG
- Row-level security policies

### API Routes
- `/api/deals/analyze` - AI analysis of deals
- `/api/memos/generate` - Investment memo generation
- Auth and dashboard routes in `/app/api/`

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
- `OPENAI_API_KEY` (secret - server-side only)
- `SUPABASE_SERVICE_ROLE_KEY` (secret - edge functions only)

⚠️ **Security**: See `.env.local.example` and `SECURITY.md` for proper secret handling

### Component Patterns
- Use shadcn/ui components from `/components/ui`
- Form validation with react-hook-form + zod
- Server Components by default, Client Components with "use client"
- Tailwind CSS with custom theme extending Radix colors