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
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Recommendation section for ${dealData.company.name}.

Deal Summary:
- Stage: ${dealData.stage}
- Requested Amount: $${dealData.funding_amount?.toLocaleString() || 'TBD'}
- Valuation: $${dealData.valuation?.toLocaleString() || 'TBD'}
- HTV Allocation: $${dealData.check_size_max?.toLocaleString() || 'TBD'}

Overall Score: ${analysisData.scores?.overall || 'N/A'}/10

Provide:
1. Clear investment recommendation with rationale
2. Specific terms and check size suggestion
3. Key diligence items or conditions
4. Recommended next steps and timeline
5. Strategic considerations for HTV

Be direct and actionable in your recommendation.

IMPORTANT: 
- The company's pitch deck and supporting documents are already available in your vector store
- Use file_search to reference specific data points from documents to support your recommendation
- Base recommendations on actual data from documents, not assumptions
- If recommending specific terms or conditions, tie them to document evidence
- NEVER guess or fabricate:
  * Specific valuation caps or discount rates
  * Board seat requirements
  * Pro-rata rights percentages
  * Liquidation preferences
- If deal terms aren't specified in documents, recommend "standard terms for stage"
- Do NOT ask for documents to be uploaded - they are already available`,
  maxTokens: 1500
}

serve((req) => generateMemoSection(req, config))
