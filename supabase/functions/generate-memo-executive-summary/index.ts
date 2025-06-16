import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'executive_summary',
  sectionOrder: 1,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Executive Summary section of an investment memo. This should be 2-3 paragraphs that capture:
1. Company overview and core value proposition
2. Key investment highlights and thesis alignment
3. Primary recommendation with deal terms

Use the provided deal data and analysis. Include inline citations [N] when referencing specific information from documents or web searches.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Executive Summary section for ${dealData.company.name}.

Company: ${dealData.company.name}
Stage: ${dealData.stage}
Funding Amount: $${dealData.funding_amount?.toLocaleString() || 'TBD'}
Valuation: $${dealData.valuation?.toLocaleString() || 'TBD'}

Analysis Summary:
${JSON.stringify(analysisData.result?.executive_summary || analysisData.result || {}, null, 2)}

Focus on:
- Clear articulation of what the company does
- Why this is compelling for HTV's thesis
- Investment recommendation and rationale
- Key metrics and traction points

IMPORTANT: 
- ALWAYS use file_search to reference specific information from uploaded pitch decks and documents
- When referencing the company, ensure you use the correct domain (e.g., adbuy.ai not adbuy.com)
- Include specific metrics and data points from the pitch deck with citations`,
  maxTokens: 1500
}

serve((req) => generateMemoSection(req, config))