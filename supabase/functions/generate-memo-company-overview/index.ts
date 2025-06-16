import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'company_overview',
  sectionOrder: 3,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Company Overview section. Provide a comprehensive overview including:
1. Company background and founding story
2. Core products/services and value proposition  
3. Target customers and use cases
4. Current traction and key metrics
5. Competitive advantages

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Company Overview section for ${dealData.company.name}.

Company: ${dealData.company.name}
Website: ${dealData.company.website || analysisData.result?.company_website || 'Not provided'}
Founded: ${dealData.company.founded_date || 'Not provided'}
Stage: ${dealData.stage}

Description: ${dealData.company.description}

Analysis Data:
${JSON.stringify(analysisData.result?.company_overview || analysisData.result?.company_info || {}, null, 2)}

Provide:
1. Detailed explanation of what the company does
2. Problem they're solving and why it matters
3. Their solution and how it works
4. Customer segments and go-to-market strategy
5. Key metrics, traction, and growth indicators

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST for all company-specific facts (metrics, team, product details)
- Be specific about the company's correct domain and naming (e.g., adbuy.ai not adbuy.com)
- Extract from documents: revenue, users, growth rates, customer names, partnerships
- THEN use web_search_preview to ENRICH the overview with:
  * Recent news about the company or founders
  * Industry context for their solution
  * Competitor comparisons and market positioning
  * Technology trends relevant to their approach
  * Customer reviews or case studies if publicly available
  * Industry recognition, awards, or press coverage
- If specific metrics are not in documents, state "not disclosed" - don't guess
- Company facts from documents ALWAYS override any conflicting web info
- Build a comprehensive picture by combining internal data with external context
- Include specific numbers and cite all sources with [N] references`,
  maxTokens: 2500
}

serve((req) => generateMemoSection(req, config))