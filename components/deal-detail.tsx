'use client'

import { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

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
  thesis_fit: { name: 'Thesis Fit', color: 'bg-slate-100 text-slate-700' },
  signals: { name: 'Signals', color: 'bg-blue-100 text-blue-700' },
  validation: { name: 'Validation', color: 'bg-yellow-100 text-yellow-700' },
  conviction: { name: 'Conviction', color: 'bg-green-100 text-green-700' },
  term_sheet: { name: 'Term Sheet', color: 'bg-purple-100 text-purple-700' },
  due_diligence: { name: 'Due Diligence', color: 'bg-indigo-100 text-indigo-700' },
  closed: { name: 'Closed', color: 'bg-pink-100 text-pink-700' },
}

export default function DealDetail({ deal }: DealDetailProps) {
  const [generatingMemo, setGeneratingMemo] = useState(false)

  const latestAnalysis = deal.deal_analyses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const handleGenerateMemo = async () => {
    setGeneratingMemo(true)
    try {
      const response = await fetch('/api/memos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id }),
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error generating memo:', error)
    } finally {
      setGeneratingMemo(false)
    }
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const avgScore = () => {
    const scores = [deal.thesis_fit_score, deal.market_score, deal.team_score, deal.product_score].filter(Boolean)
    return scores.length > 0 ? scores.reduce((a, b) => a! + b!, 0) / scores.length : null
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
                  <Badge className={stageConfig[deal.stage].color}>
                    {stageConfig[deal.stage].name}
                  </Badge>
                  {deal.company.industry && (
                    <Badge variant="outline">
                      <Globe className="w-3 h-3 mr-1" />
                      {deal.company.industry}
                    </Badge>
                  )}
                  {deal.company.funding_stage && (
                    <Badge variant="outline">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {deal.company.funding_stage}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
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
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Memo
                  </>
                )}
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
        <TabsContent value="overview">
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
                {deal.company.founded && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Founded</span>
                    </div>
                    <span className="text-sm">{deal.company.founded}</span>
                  </div>
                )}
                {deal.company.team_size && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Team Size</span>
                    </div>
                    <span className="text-sm">{deal.company.team_size} people</span>
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
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {(latestAnalysis.result as any)?.content || 'No analysis content available'}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No analysis available yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload documents to generate an AI analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
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
                        <Badge variant={doc.status === 'completed' ? 'success' : doc.status === 'processing' ? 'warning' : 'destructive'}>
                          {doc.status}
                        </Badge>
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
                    <div key={memo.id} className="group relative p-4 rounded-lg border hover:border-primary/20 transition-all card-hover">
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
                            <Badge variant={memo.status === 'final' ? 'success' : 'secondary'}>
                              {memo.status}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
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
    </div>
  )
}