'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database'
import { 
  Building2, 
  FileText, 
  BarChart3, 
  Calendar,
  DollarSign,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Globe,
  MapPin,
  ArrowUpRight,
  Download,
  Clock,
  ChevronRight,
  Upload,
  Search,
  Edit3,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
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
import Link from 'next/link'
import DealDocumentUpload from '@/components/deal-document-upload'
import { cn } from '@/lib/utils'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
  documents: Database['public']['Tables']['documents']['Row'][]
  deal_analyses: Database['public']['Tables']['deal_analyses']['Row'][]
  investment_memos: Database['public']['Tables']['investment_memos']['Row'][]
}

interface DealDetailProps {
  deal: Deal
}

const stageConfig = {
  thesis_fit: { name: 'Thesis Fit', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  signals: { name: 'Signals', color: 'bg-gray-200 text-gray-800 border-gray-400' },
  validation: { name: 'Validation', color: 'bg-gray-300 text-gray-900 border-gray-500' },
  conviction: { name: 'Conviction', color: 'bg-gray-400 text-gray-900 border-gray-600' },
  term_sheet: { name: 'Term Sheet', color: 'bg-gray-700 text-white border-gray-800' },
  due_diligence: { name: 'Due Diligence', color: 'bg-gray-800 text-white border-gray-900' },
  closed: { name: 'Closed', color: 'bg-black text-white border-black' },
}

export default function DealDetail({ deal }: DealDetailProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [generatingMemo, setGeneratingMemo] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [analyzingDeal, setAnalyzingDeal] = useState(false)

  const latestAnalysis = deal.deal_analyses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const handleGenerateMemo = async () => {
    setGeneratingMemo(true)
    try {
      const response = await fetch('/api/memos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id })
      })
      
      const data = await response.json()
      
      if (response.ok && data.memoId) {
        toast({
          title: 'Memo Generation Started',
          description: 'Your investment memo is being generated. Redirecting to progress view...',
        })
        // Redirect to the memo progress view immediately
        setTimeout(() => {
          window.location.href = `/dashboard/memos/${data.memoId}`
        }, 1000)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to start memo generation',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('Error starting memo generation:', error)
      toast({
        title: 'Error',
        description: 'Failed to start memo generation',
          variant: 'destructive',
        })
      }
    } finally {
      setGeneratingMemo(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      setSearching(true)
      const response = await fetch('/api/search/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          dealId: deal.id,
          limit: 5
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Error searching documents:', error)
      toast({
        title: 'Search failed',
        description: 'Failed to search documents. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: 'Deal deleted',
          description: 'The deal has been successfully deleted.',
        })
        router.push('/dashboard/deals')
      } else {
        const error = await response.json()
        toast({
          title: 'Delete failed',
          description: error.error || 'Failed to delete deal. Please try again.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting deal:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete deal. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleAnalyzeDeal = async () => {
    if (!deal.documents || deal.documents.length === 0) {
      toast({
        title: 'No documents',
        description: 'Please upload documents before running analysis.',
        variant: 'destructive'
      })
      return
    }

    setAnalyzingDeal(true)
    
    try {
      const response = await fetch('/api/deals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id })
      })
      
      if (response.ok) {
        toast({
          title: 'Analysis started',
          description: 'AI analysis has been triggered. This may take a few moments.',
        })
        // Reload page after a delay to show new analysis
        setTimeout(() => window.location.reload(), 3000)
      } else {
        const errorData = await response.json()
        console.error('Analysis failed:', errorData)
        toast({
          title: 'Analysis failed',
          description: errorData.error || 'Failed to analyze deal. Please try again.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error analyzing deal:', error)
      toast({
        title: 'Analysis failed',
        description: 'Failed to analyze deal. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setAnalyzingDeal(false)
    }
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 8) return 'text-gray-900 dark:text-white'
    if (score >= 6) return 'text-gray-700 dark:text-gray-300'
    return 'text-gray-500 dark:text-gray-500'
  }

  const avgScore = () => {
    const scores = [deal.thesis_fit_score, deal.market_score, deal.team_score, deal.product_score].filter(Boolean) as number[]
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  }

  const renderAnalysis = (analysis: any) => {
    if (!analysis) return <p className="text-muted-foreground">No analysis data available.</p>

    return (
      <div className="space-y-6">
        {/* Executive Summary */}
        {analysis.executive_summary && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
            <p className="text-muted-foreground">{analysis.executive_summary}</p>
          </div>
        )}

        {/* Scores */}
        {analysis.scores && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Scores</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.scores.team}/10</div>
                <div className="text-sm text-muted-foreground">Team</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.scores.market}/10</div>
                <div className="text-sm text-muted-foreground">Market</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.scores.product}/10</div>
                <div className="text-sm text-muted-foreground">Product</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.scores.thesis_fit}/10</div>
                <div className="text-sm text-muted-foreground">Thesis Fit</div>
              </div>
            </div>
          </div>
        )}

        {/* Team Assessment */}
        {analysis.team_assessment && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Team Assessment</h3>
            {analysis.team_assessment.strengths && analysis.team_assessment.strengths.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-sm mb-1">Strengths</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {analysis.team_assessment.strengths.map((strength: string, i: number) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.team_assessment.concerns && analysis.team_assessment.concerns.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-sm mb-1">Concerns</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {analysis.team_assessment.concerns.map((concern: string, i: number) => (
                    <li key={i}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.team_assessment.background_verification && (
              <div>
                <h4 className="font-medium text-sm mb-1">Background Verification</h4>
                <p className="text-sm text-muted-foreground">{analysis.team_assessment.background_verification}</p>
              </div>
            )}
          </div>
        )}

        {/* Market Analysis */}
        {analysis.market_analysis && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Market Analysis</h3>
            <div className="space-y-2">
              {analysis.market_analysis.size && (
                <p className="text-sm"><span className="font-medium">Market Size:</span> <span className="text-muted-foreground">{analysis.market_analysis.size}</span></p>
              )}
              {analysis.market_analysis.growth_rate && (
                <p className="text-sm"><span className="font-medium">Growth Rate:</span> <span className="text-muted-foreground">{analysis.market_analysis.growth_rate}</span></p>
              )}
              {analysis.market_analysis.trends && analysis.market_analysis.trends.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-1">Trends</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {analysis.market_analysis.trends.map((trend: string, i: number) => (
                      <li key={i}>{trend}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.market_analysis.competitors && analysis.market_analysis.competitors.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-1">Competitors</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {analysis.market_analysis.competitors.map((competitor: string, i: number) => (
                      <li key={i}>{competitor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Evaluation */}
        {analysis.product_evaluation && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Product Evaluation</h3>
            <div className="space-y-2">
              {analysis.product_evaluation.differentiation && (
                <div>
                  <p className="font-medium text-sm mb-1">Differentiation</p>
                  <p className="text-sm text-muted-foreground">{analysis.product_evaluation.differentiation}</p>
                </div>
              )}
              {analysis.product_evaluation.technical_assessment && (
                <div>
                  <p className="font-medium text-sm mb-1">Technical Assessment</p>
                  <p className="text-sm text-muted-foreground">{analysis.product_evaluation.technical_assessment}</p>
                </div>
              )}
              {analysis.product_evaluation.customer_validation && (
                <div>
                  <p className="font-medium text-sm mb-1">Customer Validation</p>
                  <p className="text-sm text-muted-foreground">{analysis.product_evaluation.customer_validation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Investment Recommendation */}
        {analysis.investment_recommendation && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Investment Recommendation</h3>
            <div className="space-y-2">
              {analysis.investment_recommendation.decision && (
                <Badge className={cn(
                  "mb-2",
                  analysis.investment_recommendation.decision === 'invest' && "bg-green-100 text-green-800",
                  analysis.investment_recommendation.decision === 'explore' && "bg-yellow-100 text-yellow-800",
                  analysis.investment_recommendation.decision === 'pass' && "bg-red-100 text-red-800"
                )}>
                  {analysis.investment_recommendation.decision.toUpperCase()}
                </Badge>
              )}
              {analysis.investment_recommendation.rationale && (
                <p className="text-sm text-muted-foreground">{analysis.investment_recommendation.rationale}</p>
              )}
              {analysis.investment_recommendation.next_steps && analysis.investment_recommendation.next_steps.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-1">Next Steps</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {analysis.investment_recommendation.next_steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risks */}
        {analysis.risks && analysis.risks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Key Risks</h3>
            <div className="space-y-3">
              {analysis.risks.map((risk: any, i: number) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm">{risk.category}</p>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                  {risk.mitigation && (
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Mitigation:</span> {risk.mitigation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">{deal.company.name}</h1>
                <p className="text-lg text-muted-foreground mt-1">{deal.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <Badge 
                    variant="outline"
                    className={`border-2 ${stageConfig[deal.stage].color}`}
                  >
                    {stageConfig[deal.stage].name}
                  </Badge>
                  {deal.company.location && (
                    <Badge variant="outline">
                      <Globe className="w-3 h-3 mr-1" />
                      {deal.company.location}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = `/dashboard/deals/${deal.id}/edit`}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
              <Button
                onClick={handleGenerateMemo}
                disabled={generatingMemo || !latestAnalysis}
                size="sm"
              >
                {generatingMemo ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Starting Generation...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Memo
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pb-6">
            {deal.check_size_max && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Check Size
                </div>
                <div className="text-2xl font-bold">
                  ${(deal.check_size_max / 1000000).toFixed(1)}M
                </div>
              </div>
            )}
            {deal.valuation && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Valuation
                </div>
                <div className="text-2xl font-bold">
                  ${(deal.valuation / 1000000).toFixed(0)}M
                </div>
              </div>
            )}
            {deal.round_size && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <Target className="w-4 h-4 mr-1" />
                  Round Size
                </div>
                <div className="text-2xl font-bold">
                  ${(deal.round_size / 1000000).toFixed(1)}M
                </div>
              </div>
            )}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                Added
              </div>
              <div className="text-xl font-bold">
                {format(new Date(deal.created_at), 'MMM d')}
              </div>
            </div>
            {avgScore() !== null && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Avg Score
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(avgScore())}`}>
                  {avgScore()?.toFixed(1)}/10
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Scores Card */}
      {(deal.thesis_fit_score || deal.market_score || deal.team_score || deal.product_score) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investment Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {deal.thesis_fit_score !== null && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Thesis Fit</span>
                    <span className={`text-sm font-bold ${getScoreColor(deal.thesis_fit_score)}`}>
                      {deal.thesis_fit_score}/10
                    </span>
                  </div>
                  <Progress value={deal.thesis_fit_score * 10} className="h-2" />
                </div>
              )}
              {deal.market_score !== null && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Market</span>
                    <span className={`text-sm font-bold ${getScoreColor(deal.market_score)}`}>
                      {deal.market_score}/10
                    </span>
                  </div>
                  <Progress value={deal.market_score * 10} className="h-2" />
                </div>
              )}
              {deal.team_score !== null && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Team</span>
                    <span className={`text-sm font-bold ${getScoreColor(deal.team_score)}`}>
                      {deal.team_score}/10
                    </span>
                  </div>
                  <Progress value={deal.team_score * 10} className="h-2" />
                </div>
              )}
              {deal.product_score !== null && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Product</span>
                    <span className={`text-sm font-bold ${getScoreColor(deal.product_score)}`}>
                      {deal.product_score}/10
                    </span>
                  </div>
                  <Progress value={deal.product_score * 10} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="memos">Memos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Upload Section - Only show if no documents */}
          {(!deal.documents || deal.documents.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No documents uploaded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload pitch decks, financials, and other documents to enable AI analysis
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const tabsList = document.querySelector('[role="tablist"]')
                      const documentsTab = tabsList?.querySelector('[value="documents"]') as HTMLElement
                      documentsTab?.click()
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deal.company.website && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-sm">
                      <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Website</span>
                    </div>
                    <a 
                      href={deal.company.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline flex items-center"
                    >
                      {new URL(deal.company.website).hostname}
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                )}
                {deal.company.location && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Location</span>
                    </div>
                    <span className="text-sm">{deal.company.location}</span>
                  </div>
                )}
                {deal.company.founded_date && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Founded</span>
                    </div>
                    <span className="text-sm">{deal.company.founded_date}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {deal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <Card>
            <CardContent className="pt-6">
              {latestAnalysis ? (
                <div className="space-y-4">
                  {/* Retry Analysis Button */}
                  {deal.documents && deal.documents.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAnalyzeDeal}
                        disabled={analyzingDeal}
                        size="sm"
                        variant="outline"
                      >
                        {analyzingDeal ? (
                          <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Target className="mr-2 h-4 w-4" />
                            Re-run Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {renderAnalysis(latestAnalysis.result as any)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No analysis available yet.</p>
                  {deal.documents && deal.documents.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Documents found. Click below to run AI analysis.
                      </p>
                      <Button
                        onClick={handleAnalyzeDeal}
                        disabled={analyzingDeal}
                      >
                        {analyzingDeal ? (
                          <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Target className="mr-2 h-4 w-4" />
                            Run Analysis
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload documents to generate an AI analysis.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Upload Area - Always visible at top */}
          <DealDocumentUpload
            dealId={deal.id}
            companyId={deal.company_id}
            organizationId={deal.organization_id}
            onUploadComplete={() => window.location.reload()}
          />
          
          <Card>
            <CardContent className="pt-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Search Results</h4>
                    {searchResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {result.title}
                            </h4>
                            {result.relevant_chunks && result.relevant_chunks[0] && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.relevant_chunks[0].content}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded {format(new Date(result.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {result.relevant_chunks && result.relevant_chunks[0] && (
                            <Badge variant="outline" className="ml-2">
                              {Math.round(result.relevant_chunks[0].similarity * 100)}% match
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {deal.documents.length > 0 ? (
                <div className="space-y-3">
                  {deal.documents.map((doc) => (
                    <div key={doc.id} className="group relative flex items-center justify-between p-4 rounded-lg border hover:border-primary/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Memos Tab */}
        <TabsContent value="memos">
          <Card>
            <CardContent className="pt-6">
              {deal.investment_memos.length > 0 ? (
                <div className="space-y-3">
                  {deal.investment_memos.map((memo) => (
                    <Link key={memo.id} href={`/dashboard/memos/${memo.id}`}>
                      <div className="group relative p-4 rounded-lg border hover:border-primary/20 transition-all card-hover cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {memo.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline">
                                v{memo.version}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(memo.created_at), 'MMM d, yyyy')}
                              </span>
                              <Badge variant={memo.status === 'completed' ? 'success' : 'secondary'}>
                                {memo.status}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No memos generated yet</p>
                  <Button 
                    onClick={handleGenerateMemo}
                    disabled={generatingMemo || !latestAnalysis}
                    size="sm" 
                    className="mt-4"
                  >
                    {generatingMemo ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate First Memo
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.company.name}"? This action cannot be undone and will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All deal information and scores</li>
                <li>All uploaded documents</li>
                <li>All AI analyses</li>
                <li>All investment memos</li>
              </ul>
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
                'Delete Deal'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}