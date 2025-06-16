import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'investment_rationale',
  sectionOrder: 8,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Investment Rationale section. Focus on:
1. Key investment highlights
2. Value creation opportunities
3. Strategic advantages for HTV
4. Expected returns potential
5. Portfolio fit and synergies

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Investment Rationale section for ${dealData.company.name}.

Deal Terms:
- Stage: ${dealData.stage}
- Valuation: $${dealData.valuation?.toLocaleString() || 'TBD'}
- HTV Check: $${dealData.check_size_max?.toLocaleString() || 'TBD'}

Analysis Scores:
- Thesis Fit: ${analysisData.scores?.thesis_fit || 'N/A'}/10
- Market Opportunity: ${analysisData.scores?.market_opportunity || 'N/A'}/10
- Team Quality: ${analysisData.scores?.team_quality || 'N/A'}/10

Articulate:
1. Why HTV should invest in this company
2. Expected return profile and exit scenarios
3. Strategic value and portfolio synergies
4. Key milestones and value inflection points
5. HTV's unique ability to add value

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST for company's stated projections and exit scenarios
- THEN use web_search_preview EXTENSIVELY to research:
  * Recent exits and acquisitions in this space
  * Comparable company valuations and multiples
  * Industry consolidation trends and strategic buyers
  * Public company multiples for similar businesses
  * Recent funding rounds and valuations for competitors
  * Market dynamics driving M&A activity
  * Historical returns in this sector
- Build investment case by combining:
  * Company's projections (if provided in documents)
  * Market comparables and recent transactions (from web research)
  * Industry valuation trends and exit activity
  * Strategic buyer landscape and acquisition patterns
- For return scenarios, use web research to find relevant benchmarks
- Always distinguish between company projections and market-based analysis
- If company hasn't provided projections, use industry data to inform scenarios
- Include specific examples and cite all sources with [N] references`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
