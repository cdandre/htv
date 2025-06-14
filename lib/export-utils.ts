import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

interface MemoContent {
  executive_summary?: string
  investment_thesis?: string
  company_overview?: string
  market_opportunity?: string
  team_assessment?: string
  product_technology?: string
  traction_metrics?: string
  competitive_analysis?: string
  financial_analysis?: string
  risks_mitigation?: string
  recommendation?: string
  proposed_terms?: string
}

interface MemoData {
  id: string
  created_at: string
  content: MemoContent
  deal?: {
    company?: {
      name: string
    }
    stage: string
  }
}

export async function exportMemoToWord(memo: MemoData): Promise<Blob> {
  const sections = []
  
  // Title and metadata
  sections.push(
    new Paragraph({
      text: 'Investment Memo',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  )
  
  if (memo.deal) {
    sections.push(
      new Paragraph({
        text: memo.deal.company?.name || 'Unknown Company',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    )
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Stage: ', bold: true }),
          new TextRun(memo.deal.stage),
          new TextRun({ text: '   |   ' }),
          new TextRun({ text: 'Date: ', bold: true }),
          new TextRun(new Date(memo.created_at).toLocaleDateString())
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    )
  }
  
  // Executive Summary
  if (memo.content.executive_summary) {
    sections.push(
      new Paragraph({
        text: 'Executive Summary',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.executive_summary,
        spacing: { after: 400 }
      })
    )
  }
  
  // Investment Thesis
  if (memo.content.investment_thesis) {
    sections.push(
      new Paragraph({
        text: 'Investment Thesis',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.investment_thesis,
        spacing: { after: 400 }
      })
    )
  }
  
  // Company Overview
  if (memo.content.company_overview) {
    sections.push(
      new Paragraph({
        text: 'Company Overview',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.company_overview,
        spacing: { after: 400 }
      })
    )
  }
  
  // Market Opportunity
  if (memo.content.market_opportunity) {
    sections.push(
      new Paragraph({
        text: 'Market Opportunity',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.market_opportunity,
        spacing: { after: 400 }
      })
    )
  }
  
  // Team Assessment
  if (memo.content.team_assessment) {
    sections.push(
      new Paragraph({
        text: 'Team Assessment',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.team_assessment,
        spacing: { after: 400 }
      })
    )
  }
  
  // Product & Technology
  if (memo.content.product_technology) {
    sections.push(
      new Paragraph({
        text: 'Product & Technology',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.product_technology,
        spacing: { after: 400 }
      })
    )
  }
  
  // Traction & Metrics
  if (memo.content.traction_metrics) {
    sections.push(
      new Paragraph({
        text: 'Traction & Metrics',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.traction_metrics,
        spacing: { after: 400 }
      })
    )
  }
  
  // Competitive Analysis
  if (memo.content.competitive_analysis) {
    sections.push(
      new Paragraph({
        text: 'Competitive Analysis',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.competitive_analysis,
        spacing: { after: 400 }
      })
    )
  }
  
  // Financial Analysis
  if (memo.content.financial_analysis) {
    sections.push(
      new Paragraph({
        text: 'Financial Analysis',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.financial_analysis,
        spacing: { after: 400 }
      })
    )
  }
  
  // Risks & Mitigation
  if (memo.content.risks_mitigation) {
    sections.push(
      new Paragraph({
        text: 'Risks & Mitigation',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.risks_mitigation,
        spacing: { after: 400 }
      })
    )
  }
  
  // Recommendation
  if (memo.content.recommendation) {
    sections.push(
      new Paragraph({
        text: 'Recommendation',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.recommendation,
        spacing: { after: 400 }
      })
    )
  }
  
  // Proposed Terms
  if (memo.content.proposed_terms) {
    sections.push(
      new Paragraph({
        text: 'Proposed Terms',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: memo.content.proposed_terms,
        spacing: { after: 400 }
      })
    )
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  })
  
  const buffer = await Packer.toBlob(doc)
  return buffer
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}