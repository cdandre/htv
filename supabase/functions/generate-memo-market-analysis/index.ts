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
  },
  maxTokens: 2500
}

serve((req) => generateMemoSection(req, config))
