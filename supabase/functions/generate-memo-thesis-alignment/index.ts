import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { generateMemoSection, SectionGeneratorConfig } from '../_shared/memo-section-base.ts'

const config: SectionGeneratorConfig = {
  sectionType: 'thesis_alignment',
  sectionOrder: 2,
  systemPrompt: `You are an investment analyst at HTV (Hustle Through Ventures), a pre-seed/seed stage VC focused on housing and home technology.

Generate ONLY the Investment Thesis Alignment section. Focus on how this deal aligns with HTV's core thesis areas:
1. Fixing buying, selling, and financing homes
2. Managing and maintaining homes efficiently  
3. Construction tech and sustainable building
4. Prop-tech infrastructure and enabling technologies

Include inline citations [N] when referencing specific information.`,
  userPromptTemplate: ({ dealData, analysisData }) => `Generate the Investment Thesis Alignment section for ${dealData.company.name}.

HTV Investment Thesis:
We invest in startups revolutionizing housing and home technology across:
- Home transactions (buying, selling, financing) 
- Property management and maintenance
- Construction technology and sustainable building
- Prop-tech infrastructure

Company: ${dealData.company.name}
Description: ${dealData.company.description}

Thesis Fit Score: ${analysisData.scores?.thesis_fit || 'N/A'}/10
Analysis: ${JSON.stringify(analysisData.result?.thesis_alignment || {}, null, 2)}

Explain:
1. Which specific HTV thesis areas this company addresses
2. How their solution aligns with our investment focus
3. Why this is a compelling opportunity within our thesis
4. Market timing considerations

IMPORTANT: The company's pitch deck and supporting documents are already available in your vector store. Use file_search to extract specific evidence about how the company aligns with HTV's thesis from these uploaded documents. Do NOT ask for documents to be uploaded - they are already available.`,
  maxTokens: 2000
}

serve((req) => generateMemoSection(req, config))