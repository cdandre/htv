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
  userPromptTemplate: ({ dealData, analysisData }) => {
    const analysis = analysisData.result || {}
    const teamAssessment = analysis.team_assessment || {}
    
    return `Generate the Team & Execution section.

INITIAL TEAM ASSESSMENT:
- Key Strengths: ${teamAssessment.strengths?.join(', ') || 'See analysis'}
- Key Concerns: ${teamAssessment.concerns?.join(', ') || 'None identified'}
- Background Verification: ${teamAssessment.background_verification || 'See documents'}`
  }

Evaluate:
1. Founder profiles and relevant experience
2. Team composition and key hires
3. Advisory board and investors
4. Past execution and achievements
5. Organizational culture and values

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search FIRST for team info provided in company documents
- Team facts from documents are authoritative (names, roles, company background)
- THEN use web_search_preview EXTENSIVELY to research:
  * LinkedIn profiles and professional backgrounds
  * Previous startup experiences and exits
  * Academic publications or patents
  * Industry recognition and speaking engagements
  * Previous companies' outcomes and performance
  * Network connections and advisor relationships
  * Domain expertise validation through public work
- Build comprehensive team assessment by combining:
  * Company-provided team information (from documents)
  * Public professional profiles and achievements (from web)
  * Industry reputation and track record
  * Network quality and advisor credentials
- Never fabricate specific facts, but do research public information
- Distinguish: "Company materials show..." vs "Public profiles indicate..."
- Validate domain expertise claims through web research
- Include specific examples and cite all sources with [N] references`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))
