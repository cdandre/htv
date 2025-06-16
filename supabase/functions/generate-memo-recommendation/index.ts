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
  }

Provide:
1. Clear investment recommendation with rationale
2. Specific terms and check size suggestion
3. Key diligence items or conditions
4. Recommended next steps and timeline
5. Strategic considerations for HTV

Be direct and actionable in your recommendation.

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search for company-specific data supporting the recommendation
- Base initial recommendation on document evidence
- THEN use web_search_preview to strengthen recommendation with:
  * Market comparables and recent deal terms
  * Standard terms for similar stage/sector deals
  * Recent exits and returns in this space
  * Competitive dynamics affecting urgency
  * Co-investor quality and syndicate potential
  * Market timing and momentum factors
- Build recommendation by combining:
  * Company performance data (from documents)
  * Market benchmarks and deal comps (from web research)
  * Industry best practices for terms
  * Strategic timing considerations
- Never fabricate specific company terms, but research market standards
- If terms not in documents, use "market standard" with web-researched context
- Support recommendation with both company data and market evidence
- Include specific examples and cite all sources with [N] references`,
  maxTokens: 1500
}

serve((req) => generateMemoSection(req, config))
