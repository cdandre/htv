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
  userPromptTemplate: ({ dealData, analysisData }) => {
    const analysis = analysisData.result || {}
    const marketAnalysis = analysis.market_analysis || {}
    
    return `Generate the Market Analysis section.

INITIAL MARKET ASSESSMENT:
- Market Size: ${marketAnalysis.size || 'To be researched'}
- Growth Rate: ${marketAnalysis.growth_rate || 'To be researched'}
- Key Trends: ${marketAnalysis.trends?.join(', ') || 'To be researched'}
- Main Competitors: ${marketAnalysis.competitors?.join(', ') || 'To be researched'}`
  }

Provide:
1. TAM, SAM, SOM analysis with data sources
2. Market growth projections and key trends
3. Industry dynamics and key success factors
4. Competitive landscape and positioning
5. Why the timing is right for this solution

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST to check if the company provides specific TAM/SAM/SOM figures in their documents
- If the pitch deck states market sizes, use those as the baseline but ENRICH with web research
- ACTIVELY USE web_search_preview to find:
  * Recent market research reports and industry analyses
  * Competitor funding rounds and market valuations
  * Industry growth projections from multiple sources
  * Regulatory changes affecting the market
  * Technology adoption trends and customer behavior shifts
  * Geographic market variations and expansion opportunities
- Create a COMPREHENSIVE market analysis by combining:
  * Company's view of the market (from documents)
  * Independent market research (from web)
  * Competitive dynamics and recent market movements
  * Multiple perspectives on market size and growth
- If company doesn't provide market sizing, use web research extensively
- Always distinguish between company claims and independent research
- Include specific numbers and cite all sources with [N] references
- Build a rich, multi-faceted view of the market opportunity`,
  maxTokens: 2500
}

serve((req) => generateMemoSection(req, config))
