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
- Use file_search FIRST for ALL company financial data (revenue, burn, runway, metrics)
- Company financial data from documents is authoritative - NEVER override
- If financials not disclosed, state "not provided in documents"
- THEN use web_search_preview EXTENSIVELY to research:
  * Industry benchmarks for similar business models
  * Typical unit economics in this sector
  * Pricing strategies of competitors
  * Customer acquisition costs across the industry
  * Revenue multiples and growth rates for comparables
  * Burn rates and capital efficiency benchmarks
  * Path to profitability timelines for similar companies
- Build comprehensive analysis by combining:
  * Company's actual financials (from documents)
  * Industry benchmarks and standards (from web research)
  * Competitive pricing and business model comparisons
  * Market best practices for unit economics
- Never fabricate company-specific numbers, but do provide industry context
- Clearly distinguish: "Company reports..." vs "Industry benchmarks show..."
- Include specific comparisons and cite all sources with [N] references`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
