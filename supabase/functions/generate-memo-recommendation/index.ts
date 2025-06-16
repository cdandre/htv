import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'recommendation',
  sectionOrder: 10,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Recommendation section. Provide a clear, actionable recommendation:
1. Investment decision (invest/pass/follow)
2. Recommended check size and terms
3. Key conditions or milestones
4. Follow-up actions required
5. Timeline considerations

Be decisive and specific.`,
  userPromptTemplate: ({ dealData, analysisData }) => {
    const analysis = analysisData.result || {}
    const scores = analysis.scores || {}
    const dealDetails = analysis.deal_details || {}
    const avgScore = (scores.team + scores.market + scores.product + scores.thesis_fit) / 4 || 0
    
    return `Generate the Recommendation section for ${dealData.company.name}.

Deal Summary:
- Stage: ${dealDetails.stage || dealData.stage || 'TBD'}
- Requested Amount: $${dealDetails.round_size?.toLocaleString() || 'TBD'}
- Valuation: $${dealDetails.valuation?.toLocaleString() || 'TBD'}
- HTV Allocation: $${dealDetails.check_size_min && dealDetails.check_size_max ? 
    `$${dealDetails.check_size_min.toLocaleString()} - $${dealDetails.check_size_max.toLocaleString()}` : 
    'TBD'}

Average Score: ${avgScore.toFixed(1)}/10
Initial Recommendation: ${analysis.investment_recommendation?.decision || 'Pending'}`
  },
  maxTokens: 1500
}

serve((req) => generateMemoSection(req, config))
