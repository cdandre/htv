import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'risks_mitigation',
  sectionOrder: 9,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Risks & Mitigation section. Provide a balanced assessment of:
1. Market risks and competitive threats
2. Execution and operational risks
3. Technology and product risks
4. Financial and business model risks
5. Regulatory and compliance risks

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => {
    const analysis = analysisData.result || {}
    const risks = analysis.risks || []
    
    return `Generate the Risks & Mitigation section.

INITIAL RISK ASSESSMENT:
${risks.map((risk, index) => `
Risk ${index + 1}:
- Category: ${risk.category}
- Description: ${risk.description}
- Mitigation: ${risk.mitigation}
`).join('\n') || 'No specific risks identified in initial analysis'}`
  }

Provide honest assessment of:
1. Primary market and competitive risks
2. Execution challenges and team risks
3. Technology and scalability concerns
4. Business model and unit economic risks
5. Regulatory or compliance considerations

For each risk, suggest potential mitigation strategies.

IMPORTANT: 
- Be balanced but honest about risks - this section is critical for investment decisions
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST to identify any risks acknowledged in company documents
- THEN use web_search_preview EXTENSIVELY to research:
  * Common failure patterns in this industry/business model
  * Regulatory changes or compliance issues affecting the sector
  * Competitive threats from incumbents or new entrants
  * Technology risks and obsolescence patterns
  * Market timing risks and adoption barriers
  * Recent failures or pivots of similar companies
  * Industry-specific operational challenges
  * Economic sensitivity and market cycle risks
- Build comprehensive risk assessment by combining:
  * Company-acknowledged risks (from documents)
  * Industry-wide risks and patterns (from web research)
  * Competitive dynamics and market threats
  * Regulatory and compliance landscape
- Present both company-specific and industry risks
- For each risk, research and suggest concrete mitigation strategies
- Be transparent: "Company identifies..." vs "Industry research shows..."
- Include specific examples and cite all sources with [N] references`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
