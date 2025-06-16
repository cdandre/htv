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

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST for company's specific product features and tech stack
- Product details from documents are authoritative for what they currently have
- THEN use web_search_preview to research:
  * Technology trends and best practices in their stack
  * Competitor product features and capabilities
  * Industry standards and benchmarks
  * Technology adoption curves and user preferences
  * Integration ecosystem and partnership opportunities
  * Emerging technologies that could enhance their product
  * Developer community sentiment about their tech choices
- Build comprehensive analysis by combining:
  * Company's actual product capabilities (from documents)
  * Industry technology landscape (from web research)
  * Competitive feature comparisons
  * Technology trends and future directions
- If technical specs not in documents, state "not provided" but research industry norms
- Never fabricate company-specific features, but do analyze technology potential
- Include specific comparisons and cite all sources with [N] references`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
