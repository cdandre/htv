import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'team_execution',
  sectionOrder: 7,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Team & Execution section. Focus on:
1. Founder backgrounds and expertise
2. Key team members and advisors
3. Execution track record
4. Organizational strengths
5. Hiring plans and gaps

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Team & Execution section for ${dealData.company.name}.

Team Data:
${JSON.stringify(analysisData.result?.team || {}, null, 2)}

Evaluate:
1. Founder profiles and relevant experience
2. Team composition and key hires
3. Advisory board and investors
4. Past execution and achievements
5. Organizational culture and values

IMPORTANT: The company's pitch deck and supporting documents are already available in your vector store. Use file_search to extract team bios, backgrounds, and organizational information from these uploaded documents. Additionally, use web_search_preview for LinkedIn profiles and additional background information. Do NOT ask for documents to be uploaded - they are already available.`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
