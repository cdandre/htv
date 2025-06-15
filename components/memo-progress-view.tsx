'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MemoSection {
  id: string
  type: string
  order: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
  content?: string
  error?: string
  startedAt?: string
  completedAt?: string
}

interface MemoProgressViewProps {
  memoId: string
  onComplete?: () => void
}

const SECTION_NAMES: Record<string, string> = {
  executive_summary: 'Executive Summary',
  thesis_alignment: 'Investment Thesis Alignment',
  company_overview: 'Company Overview',
  market_analysis: 'Market Analysis',
  product_technology: 'Product & Technology',
  business_model: 'Business Model & Financials',
  team_execution: 'Team & Execution',
  investment_rationale: 'Investment Rationale',
  risks_mitigation: 'Risks & Mitigation',
  recommendation: 'Recommendation'
}

export default function MemoProgressView({ memoId, onComplete }: MemoProgressViewProps) {
  const [status, setStatus] = useState<string>('generating')
  const [progress, setProgress] = useState(0)
  const [sections, setSections] = useState<MemoSection[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!memoId) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/memos/${memoId}/status`)
        if (!response.ok) {
          throw new Error('Failed to fetch memo status')
        }

        const data = await response.json()
        setStatus(data.status)
        setProgress(data.progress)
        setSections(data.sections || [])

        if (data.status === 'completed' && onComplete) {
          onComplete()
        }
      } catch (err: any) {
        console.error('Error fetching memo status:', err)
        setError(err.message)
      }
    }

    // Initial fetch
    fetchStatus()

    // Poll for updates while generating
    const interval = setInterval(() => {
      if (status === 'generating') {
        fetchStatus()
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [memoId, status, onComplete])

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <p>Error loading memo: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Memo Generation Progress</span>
            <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
              {status === 'generating' ? 'In Progress' : status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {sections.filter(s => s.status === 'completed').length} of {sections.length} sections completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section Status */}
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  section.status === 'completed' && "bg-green-50 border-green-200",
                  section.status === 'generating' && "bg-blue-50 border-blue-200",
                  section.status === 'failed' && "bg-red-50 border-red-200",
                  section.status === 'pending' && "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-3">
                  {section.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {section.status === 'generating' && (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  )}
                  {section.status === 'failed' && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {section.status === 'pending' && (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">
                    {SECTION_NAMES[section.type] || section.type}
                  </span>
                </div>
                <Badge
                  variant={
                    section.status === 'completed' ? 'default' :
                    section.status === 'generating' ? 'secondary' :
                    section.status === 'failed' ? 'destructive' :
                    'outline'
                  }
                >
                  {section.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      {sections.some(s => s.status === 'completed' && s.content) && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {sections
                .filter(s => s.status === 'completed' && s.content)
                .map((section) => (
                  <div key={section.id} className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                      {SECTION_NAMES[section.type] || section.type}
                    </h2>
                    <ReactMarkdown>{section.content || ''}</ReactMarkdown>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}