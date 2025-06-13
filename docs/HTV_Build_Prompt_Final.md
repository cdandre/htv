# HTV VC Operating System - Complete Build Prompt for Claude

Use this prompt to have Claude build the HTV MVP independently using task agents:

---

## PROMPT:

I need you to build a venture capital operating system MVP for Home Technology Ventures (HTV). You have full access to create files, run commands, and use task agents to complete the implementation. I will handle Supabase setup and can execute any Supabase CLI commands you need.

### Available Documentation:
You have access to comprehensive documentation in the `/mnt/c/Users/charl/StudioProjects/HTV/` directory:

1. **HTV_Technical_Specifications.md** - Complete system architecture, database schema, and security specs
2. **HTV_Implementation_Guide.md** - Detailed code examples and implementation patterns
3. **HTV_API_Specifications.md** - All API endpoints with request/response examples
4. **HTV_OpenAI_Responses_API_Integration.md** - How to use the new Responses API
5. **HTV_Prompt_Engineering_Guide.md** - AI prompt templates and best practices
6. **Operating System Scope of Work.md** - Original requirements from HTV
7. **Koby Powell and Charles D'Andrea_otter_ai.txt** - Conversation with specific needs

Read these documents first to understand the full scope and technical decisions already made.

### Project Context:
- **Purpose**: Automate deal screening and investment memo generation for a real estate tech VC fund
- **Priority**: Get Deal Screener and Memo Generator working ASAP
- **Key Constraint**: No existing memos yet - we'll create the first ones with this system
- **Users**: Just 2 partners (Koby and Chris) initially
- **Current Pain**: Takes 10+ hours to write a memo, want to cut to 2 hours

### Tech Stack (From Technical Specifications):
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
- Backend: Supabase (PostgreSQL + pgvector + Edge Functions)  
- AI: OpenAI Responses API with GPT-4.1 (NOT Chat Completions)
- State Management: Zustand (client), SWR (server state)
- Forms: React Hook Form + Zod validation
- Rich Text: TipTap editor
- File Upload: react-dropzone + Supabase direct upload
- Deployment: Vercel

### Implementation Priorities (From Koby's Requirements):

1. **Deal Screener** - "throw out the trash quicker"
   - Quick analysis of pitch decks
   - Competitive landscape with web search
   - Market sizing (TAM/SAM/SOM)
   - Team assessment

2. **Memo Generator** - Currently takes 10+ hours
   - 6-8 page single-spaced memos
   - Follow HTV's specific structure
   - Professional, data-driven tone
   - Export to PDF/Word

3. **Three Data Types** (Critical for the system):
   - Industry content (newsletters, articles)
   - Proprietary company data (pitch decks, financials)
   - Startup directory/market map

4. **Workflow**: Thesis → Signals → Validation → Investment

### Database Schema:
Use the complete schema from `HTV_Technical_Specifications.md` including:
- pgvector setup for embeddings
- All tables with proper relationships
- RLS policies for security
- Indexes for performance

### API Implementation:
Follow the specifications in `HTV_API_Specifications.md` and `HTV_API_Updates_Responses.md` for:
- RESTful endpoints
- Responses API integration (not Chat Completions)
- Streaming responses
- Background jobs
- Webhook handling

### AI Integration:
Use patterns from `HTV_OpenAI_Responses_API_Integration.md`:
- Stateful conversations with `previous_response_id`
- Built-in web search tool
- File search for knowledge base
- Streaming to frontend
- Function calling for data retrieval

### Prompt Templates:
Use the templates from `HTV_Prompt_Engineering_Guide.md` for:
- Deal analysis prompts
- Memo generation prompts
- Visual analysis (charts/images)
- Competitive intelligence

### Implementation Instructions:

1. **Read all documentation first** using task agents:
   - One agent to study technical architecture
   - One agent to understand API patterns
   - One agent to review AI integration
   - One agent to analyze requirements

2. **Build according to the implementation guide**:
   - Follow the code examples in `HTV_Implementation_Guide.md`
   - Use the exact database schema provided
   - Implement the API endpoints as specified
   - Use the OpenAI Responses API patterns

3. **Key features from documentation**:
   - Multi-modal document processing (text + images)
   - Web search for real-time market data
   - Stateful AI conversations
   - Background processing for long tasks
   - Real-time updates via Supabase

4. **What I need from you**:

   a. **Supabase Migrations** (I'll run these):
   ```bash
   # SUPABASE CLI:
   supabase migration new [migration_name]
   # Then provide the SQL content
   ```

   b. **Edge Functions** (I'll deploy these):
   ```bash
   # SUPABASE CLI:
   supabase functions new [function_name]
   # Then provide the TypeScript code
   ```

   c. **Next.js Application**:
   - Complete project structure
   - All components from the specifications
   - API routes as documented
   - UI matching the described workflows

5. **Testing approach**:
   - Use test strategies from `HTV_Implementation_Guide.md`
   - Create sample pitch deck data
   - Validate against requirements

### Success Criteria (From documents):
- [ ] Sub-5 minute analysis generation
- [ ] Professional memos matching VC standards
- [ ] Real competitor data from web search
- [ ] Drag-and-drop pipeline management
- [ ] 99.9% uptime for core features
- [ ] Reduce memo writing from 10+ to ~2 hours

### Start Building:
1. First, use task agents to read and understand all documentation
2. Create the Next.js project structure based on specifications
3. Implement core features following the technical guide
4. Test with sample data
5. Iterate based on the success criteria

Remember: All technical decisions have been made and documented. Follow the specifications exactly. The documentation contains code examples, database schemas, and implementation patterns - use them.

---

## HOW TO USE THIS PROMPT:

1. Make sure all HTV documentation files are in the working directory
2. Copy this entire prompt
3. Start a new Claude conversation
4. Paste the prompt
5. Claude will read all documentation and build accordingly
6. Execute any Supabase CLI commands marked clearly
7. Test and iterate

This prompt leverages all the work already done in planning and specification.