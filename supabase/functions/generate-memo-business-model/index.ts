import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'business_model',
  sectionOrder: 6,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Business Model & Financials section. Focus on:
1. Revenue model and pricing strategy
2. Unit economics and margins
3. Customer acquisition strategy
4. Financial performance and projections
5. Path to profitability

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Business Model & Financials section for ${dealData.company.name}.

Funding Stage: ${dealData.stage}
Funding Amount: $${dealData.funding_amount?.toLocaleString() || 'TBD'}

Financial Data:
${JSON.stringify(analysisData.result?.financials || analysisData.result?.business_model || {}, null, 2)}

Analyze:
1. Revenue streams and pricing model
2. Current financial metrics (ARR, burn rate, runway)
3. Unit economics and contribution margins
4. Customer acquisition costs and LTV
5. Financial projections and key assumptions

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST to extract ALL financial data from documents (revenue, burn rate, runway, unit economics)
- Financial metrics from documents are authoritative - NEVER estimate or calculate different figures
- If specific financial metrics are not in documents, explicitly state "not disclosed" or "not provided"
- NEVER guess, estimate, or fabricate financial figures like:
  * Revenue/ARR/MRR numbers
  * Burn rate or runway
  * Customer acquisition costs (CAC) or lifetime value (LTV)
  * Gross margins or unit economics
- Web search should NOT be used for company-specific financials
- Do NOT ask for documents to be uploaded - they are already available`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
