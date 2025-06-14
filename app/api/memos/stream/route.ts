import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          controller.enqueue(encoder.encode('data: {"error": "Unauthorized"}\n\n'))
          controller.close()
          return
        }
        
        const { dealId, analysisId } = await request.json()
        
        if (!dealId || !analysisId) {
          controller.enqueue(encoder.encode('data: {"error": "Missing required parameters"}\n\n'))
          controller.close()
          return
        }
        
        // Fetch deal and analysis data
        const [{ data: deal }, { data: analysis }] = await Promise.all([
          supabase.from('deals').select('*, company:companies(*)').eq('id', dealId).single(),
          supabase.from('deal_analyses').select('*').eq('id', analysisId).single()
        ])
        
        if (!deal || !analysis) {
          controller.enqueue(encoder.encode('data: {"error": "Deal or analysis not found"}\n\n'))
          controller.close()
          return
        }
        
        // Simulate streaming memo generation
        const sections = [
          { title: 'Executive Summary', progress: 10 },
          { title: 'Investment Thesis', progress: 20 },
          { title: 'Company Overview', progress: 30 },
          { title: 'Market Opportunity', progress: 40 },
          { title: 'Team Assessment', progress: 50 },
          { title: 'Product & Technology', progress: 60 },
          { title: 'Traction & Metrics', progress: 70 },
          { title: 'Competitive Analysis', progress: 80 },
          { title: 'Financial Analysis', progress: 85 },
          { title: 'Risks & Mitigation', progress: 90 },
          { title: 'Recommendation', progress: 95 },
          { title: 'Proposed Terms', progress: 100 }
        ]
        
        // Stream progress updates
        for (const section of sections) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                section: section.title,
                progress: section.progress
              })}\n\n`
            )
          )
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // Final memo content (in real implementation, this would be generated progressively)
        const memoContent = {
          executive_summary: `Based on our comprehensive analysis, ${deal.company.name} presents a compelling investment opportunity in the ${deal.sector} sector...`,
          investment_thesis: `We believe ${deal.company.name} is well-positioned to capture significant market share...`,
          company_overview: `${deal.company.name} is a ${deal.stage}-stage company focused on...`,
          market_opportunity: `The total addressable market for ${deal.sector} is estimated at...`,
          team_assessment: `The founding team brings deep domain expertise...`,
          product_technology: `The company's core technology differentiates through...`,
          traction_metrics: `Current metrics show strong product-market fit...`,
          competitive_analysis: `While competition exists from established players...`,
          financial_analysis: `Financial projections indicate a path to profitability...`,
          risks_mitigation: `Key risks include market timing and execution...`,
          recommendation: `We recommend proceeding with an investment...`,
          proposed_terms: `Proposed investment terms include...`
        }
        
        // Send completion event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'complete',
              content: memoContent
            })}\n\n`
          )
        )
        
        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing failed' })}\n\n`)
        )
        controller.close()
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}