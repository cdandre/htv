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
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Risks & Mitigation section for ${dealData.company.name}.

Risk Assessment:
${JSON.stringify(analysisData.result?.risks || {}, null, 2)}

Provide honest assessment of:
1. Primary market and competitive risks
2. Execution challenges and team risks
3. Technology and scalability concerns
4. Business model and unit economic risks
5. Regulatory or compliance considerations

For each risk, suggest potential mitigation strategies.

IMPORTANT: Be balanced but honest about risks. Use file_search and web_search_preview to research industry-specific risks.`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
