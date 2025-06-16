import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'market_analysis',
  sectionOrder: 4,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Market Analysis section. Focus on:
1. Total addressable market (TAM) sizing
2. Market growth rates and trends
3. Key market drivers and dynamics
4. Competitive landscape overview
5. Market timing considerations

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Market Analysis section for ${dealData.company.name}.

Industry: ${analysisData.result?.industry || 'Housing/PropTech'}
Market Size: ${analysisData.result?.market_analysis?.tam || 'To be researched'}

Analysis Data:
${JSON.stringify(analysisData.result?.market_analysis || {}, null, 2)}

Provide:
1. TAM, SAM, SOM analysis with data sources
2. Market growth projections and key trends
3. Industry dynamics and key success factors
4. Competitive landscape and positioning
5. Why the timing is right for this solution

IMPORTANT: 
- Use file_search FIRST to extract market data from the pitch deck (TAM, SAM, SOM, growth rates)
- Then use web_search_preview to validate and supplement with current market research
- Ensure all company references use the correct domain (e.g., adbuy.ai not adbuy.com)
- Include specific numbers and cite all sources with [N] references`,
  maxTokens: 2500
}

serve((req) => generateMemoSection(req, config))
