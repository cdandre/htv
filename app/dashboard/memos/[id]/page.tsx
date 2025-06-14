'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Download, Edit3, Share2, Clock, FileText, Loader2, Building2, Calendar, FileType } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createClient } from '@/lib/supabase/client'
import { exportMemoToWord, downloadBlob } from '@/lib/export-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface InvestmentMemo {
  id: string
  deal_id: string
  content: any
  status: 'draft' | 'final'
  version: number
  created_at: string
  updated_at: string
  generated_by: string
  deal?: {
    id: string
    company_name: string
    stage: string
    sector: string
  }
}

export default function MemoDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [exporting, setExporting] = useState(false)
  const [exportingWord, setExportingWord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [memo, setMemo] = useState<InvestmentMemo | null>(null)
  const memoRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchMemo()
  }, [params.id])
  
  const fetchMemo = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('investment_memos')
        .select(`
          *,
          deal:deals(
            id,
            company_name,
            stage,
            sector
          )
        `)
        .eq('id', params.id)
        .single()
      
      if (error) throw error
      setMemo(data)
    } catch (error) {
      console.error('Error fetching memo:', error)
      toast({
        title: 'Error',
        description: 'Failed to load investment memo',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const exportToPDF = async () => {
    if (!memoRef.current || !memo) return
    
    try {
      setExporting(true)
      
      // Create a clone of the memo content for PDF
      const clonedContent = memoRef.current.cloneNode(true) as HTMLElement
      
      // Remove interactive elements from the clone
      clonedContent.querySelectorAll('button').forEach(el => el.remove())
      
      // Create a temporary container
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '794px' // A4 width in pixels at 96 DPI
      container.style.padding = '40px'
      container.style.backgroundColor = 'white'
      container.appendChild(clonedContent)
      document.body.appendChild(container)
      
      // Generate canvas from the cloned content
      const canvas = await html2canvas(container)
      
      // Remove temporary container
      document.body.removeChild(container)
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      
      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        )
        heightLeft -= pageHeight
      }
      
      // Save the PDF
      pdf.save(`investment-memo-${memo.deal?.company_name || params.id}.pdf`)
      
      toast({
        title: 'PDF exported',
        description: 'The investment memo has been exported as PDF'
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setExporting(false)
    }
  }
  
  const exportToWord = async () => {
    if (!memo) return
    
    try {
      setExportingWord(true)
      
      const blob = await exportMemoToWord(memo)
      downloadBlob(blob, `investment-memo-${memo.deal?.company_name || params.id}.docx`)
      
      toast({
        title: 'Word document exported',
        description: 'The investment memo has been exported as a Word document'
      })
    } catch (error) {
      console.error('Error exporting Word document:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export Word document. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setExportingWord(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (!memo) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Investment memo not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </div>
    )
  }
  
  const content = memo.content || {}
  
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Edit3 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={exporting || exportingWord}
              >
                {(exporting || exportingWord) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} disabled={exporting}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToWord} disabled={exportingWord}>
                <FileType className="mr-2 h-4 w-4" />
                Export as Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <div ref={memoRef}>
          <CardHeader className="pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Investment Memo</CardTitle>
                  <p className="text-muted-foreground">
                    {memo.deal?.company_name || 'Unknown Company'}
                  </p>
                </div>
              </div>
              <Badge variant={memo.status === 'final' ? 'default' : 'secondary'}>
                {memo.status === 'final' ? 'Final' : 'Draft'} v{memo.version}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{memo.deal?.company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stage</p>
                <p className="font-medium">{memo.deal?.stage || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sector</p>
                <p className="font-medium">{memo.deal?.sector || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(memo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Executive Summary */}
            {content.executive_summary && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.executive_summary}</p>
                </div>
              </section>
            )}

            <Separator />

            {/* Investment Thesis */}
            {content.investment_thesis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Investment Thesis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.investment_thesis}</p>
                </div>
              </section>
            )}

            {/* Company Overview */}
            {content.company_overview && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Company Overview</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.company_overview}</p>
                </div>
              </section>
            )}

            {/* Market Opportunity */}
            {content.market_opportunity && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Market Opportunity</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.market_opportunity}</p>
                </div>
              </section>
            )}

            {/* Team */}
            {content.team_assessment && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Team Assessment</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.team_assessment}</p>
                </div>
              </section>
            )}

            {/* Product/Technology */}
            {content.product_technology && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Product & Technology</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.product_technology}</p>
                </div>
              </section>
            )}

            {/* Traction & Metrics */}
            {content.traction_metrics && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Traction & Metrics</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.traction_metrics}</p>
                </div>
              </section>
            )}

            {/* Competitive Analysis */}
            {content.competitive_analysis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Competitive Analysis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.competitive_analysis}</p>
                </div>
              </section>
            )}

            {/* Financial Analysis */}
            {content.financial_analysis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Financial Analysis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.financial_analysis}</p>
                </div>
              </section>
            )}

            {/* Risks & Mitigation */}
            {content.risks_mitigation && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Risks & Mitigation</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.risks_mitigation}</p>
                </div>
              </section>
            )}

            {/* Recommendation */}
            {content.recommendation && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Recommendation</h2>
                <Card className="bg-muted/50">
                  <CardContent className="p-6">
                    <p className="whitespace-pre-wrap">{content.recommendation}</p>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Terms */}
            {content.proposed_terms && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Proposed Terms</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{content.proposed_terms}</p>
                </div>
              </section>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}