import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'product_technology',
  sectionOrder: 5,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Product & Technology section. Focus on:
1. Product features and capabilities
2. Technology stack and architecture
3. Unique technical advantages
4. Product roadmap and vision
5. Integration capabilities

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Product & Technology section for ${dealData.company.name}.

Product Description: ${dealData.company.description}
Tech Stack: ${analysisData.result?.technology?.stack || 'To be analyzed'}

Analysis Data:
${JSON.stringify(analysisData.result?.product || analysisData.result?.technology || {}, null, 2)}

Cover:
1. Core product features and user experience
2. Technical architecture and infrastructure
3. Proprietary technology and IP
4. Product differentiation and moat
5. Development roadmap and future features

IMPORTANT: The company's pitch deck and supporting documents are already available in your vector store. Use file_search to extract specific technical details, architecture diagrams, feature descriptions, and roadmap information from these uploaded documents. Do NOT ask for documents to be uploaded - they are already available.`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
