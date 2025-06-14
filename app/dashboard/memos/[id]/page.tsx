'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Download, Edit3, Share2, Clock, FileText, Loader2, Building2, Calendar, FileType, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createClient } from '@/lib/supabase/client'
import { exportMemoToWord, downloadBlob } from '@/lib/export-utils'
import { marked } from 'marked'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface InvestmentMemo {
  id: string
  deal_id: string
  content: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  version: number
  created_at: string
  updated_at: string
  generated_by: string
  deal?: {
    id: string
    title: string
    stage: string
    company: {
      id: string
      name: string
    }
  }
}

// Configure marked for better formatting
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Format memo content to handle markdown
function formatMemoContent(text: string): string {
  if (!text) return ''
  
  // Convert markdown to HTML
  let html = marked(text) as string
  
  // Add some custom styling for better appearance
  html = html
    .replace(/<h1>/g, '<h1 class="text-2xl font-bold mt-6 mb-4">')
    .replace(/<h2>/g, '<h2 class="text-xl font-semibold mt-4 mb-3">')
    .replace(/<h3>/g, '<h3 class="text-lg font-medium mt-3 mb-2">')
    .replace(/<ul>/g, '<ul class="list-disc pl-6 my-3">')
    .replace(/<ol>/g, '<ol class="list-decimal pl-6 my-3">')
    .replace(/<li>/g, '<li class="mb-1">')
    .replace(/<p>/g, '<p class="mb-3">')
    .replace(/<strong>/g, '<strong class="font-semibold">')
    .replace(/<em>/g, '<em class="italic">')
  
  return html
}

export default function MemoDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [exportingWord, setExportingWord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [memo, setMemo] = useState<InvestmentMemo | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
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
            title,
            stage,
            company:companies(
              id,
              name
            )
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
      pdf.save(`investment-memo-${memo.deal?.company?.name || params.id}.pdf`)
      
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
      downloadBlob(blob, `investment-memo-${memo.deal?.company?.name || params.id}.docx`)
      
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
  
  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/memos/${params.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Investment memo deleted successfully',
        })
        router.push('/dashboard/memos')
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete memo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting memo:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete memo',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
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
          <Link href={`/dashboard/memos/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
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
                    {memo.deal?.company?.name || 'Unknown Company'}
                  </p>
                </div>
              </div>
              <Badge variant={memo.status === 'completed' ? 'default' : 'secondary'}>
                {memo.status === 'completed' ? 'Completed' : memo.status.charAt(0).toUpperCase() + memo.status.slice(1)} v{memo.version}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{memo.deal?.company?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stage</p>
                <p className="font-medium">{memo.deal?.stage || 'N/A'}</p>
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
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.executive_summary) }}
                  />
                </div>
              </section>
            )}

            {content.executive_summary && content.company_overview && <Separator />}

            {/* Company Overview */}
            {content.company_overview && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Company Overview</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.company_overview) }}
                  />
                </div>
              </section>
            )}

            {/* Team Assessment */}
            {content.team_assessment && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Team Assessment</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.team_assessment) }}
                  />
                </div>
              </section>
            )}

            {/* Problem & Solution */}
            {content.problem_solution && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Problem & Solution</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.problem_solution) }}
                  />
                </div>
              </section>
            )}

            {/* Market Opportunity */}
            {content.market_opportunity && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Market Opportunity</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.market_opportunity) }}
                  />
                </div>
              </section>
            )}

            {/* Product & Technology */}
            {content.product_technology && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Product & Technology</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.product_technology) }}
                  />
                </div>
              </section>
            )}

            {/* Business Model */}
            {content.business_model && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Business Model</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.business_model) }}
                  />
                </div>
              </section>
            )}

            {/* Traction & Metrics */}
            {content.traction_metrics && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Traction & Metrics</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.traction_metrics) }}
                  />
                </div>
              </section>
            )}

            {/* Competitive Analysis */}
            {content.competitive_analysis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Competitive Analysis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.competitive_analysis) }}
                  />
                </div>
              </section>
            )}

            {/* Financial Analysis */}
            {content.financial_analysis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Financial Analysis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.financial_analysis) }}
                  />
                </div>
              </section>
            )}

            {/* Investment Thesis */}
            {content.investment_thesis && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Investment Thesis</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.investment_thesis) }}
                  />
                </div>
              </section>
            )}

            {/* Use of Funds */}
            {content.use_of_funds && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Use of Funds</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.use_of_funds) }}
                  />
                </div>
              </section>
            )}

            {/* Risks & Mitigation */}
            {content.risks_mitigation && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Risks & Mitigation</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.risks_mitigation) }}
                  />
                </div>
              </section>
            )}

            {/* Exit Strategy */}
            {content.exit_strategy && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Exit Strategy</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.exit_strategy) }}
                  />
                </div>
              </section>
            )}

            {/* Recommendation */}
            {content.recommendation && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Recommendation</h2>
                <Card className="bg-muted/50">
                  <CardContent className="p-6">
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatMemoContent(content.recommendation) }}
                    />
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Proposed Terms */}
            {content.proposed_terms && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Proposed Terms</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.proposed_terms) }}
                  />
                </div>
              </section>
            )}

            {/* Next Steps */}
            {content.next_steps && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMemoContent(content.next_steps) }}
                  />
                </div>
              </section>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment Memo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this investment memo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                'Delete Memo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}