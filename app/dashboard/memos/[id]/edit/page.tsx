'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface MemoSection {
  key: string
  title: string
  placeholder: string
}

const memoSections: MemoSection[] = [
  {
    key: 'executive_summary',
    title: 'Executive Summary',
    placeholder: 'Provide a concise overview of the investment opportunity, including company description, investment thesis, and key highlights...'
  },
  {
    key: 'company_overview',
    title: 'Company Overview',
    placeholder: 'Detailed description of the company, its mission, founding story, and key achievements to date...'
  },
  {
    key: 'team_assessment',
    title: 'Team Assessment',
    placeholder: 'Analysis of the founding team, their backgrounds, relevant experience, and ability to execute...'
  },
  {
    key: 'problem_solution',
    title: 'Problem & Solution',
    placeholder: 'Description of the problem being solved and how the company\'s solution addresses it uniquely...'
  },
  {
    key: 'market_opportunity',
    title: 'Market Opportunity',
    placeholder: 'Market size (TAM, SAM, SOM), growth rates, trends, and dynamics. Include data and sources...'
  },
  {
    key: 'product_technology',
    title: 'Product & Technology',
    placeholder: 'Detailed product description, technology stack, intellectual property, and product roadmap...'
  },
  {
    key: 'business_model',
    title: 'Business Model',
    placeholder: 'Revenue model, pricing strategy, unit economics, and customer acquisition strategy...'
  },
  {
    key: 'traction_metrics',
    title: 'Traction & Metrics',
    placeholder: 'Current traction, key metrics, growth rates, customer testimonials, and validation...'
  },
  {
    key: 'competitive_analysis',
    title: 'Competitive Analysis',
    placeholder: 'Competitive landscape, direct and indirect competitors, competitive advantages, and moats...'
  },
  {
    key: 'financial_analysis',
    title: 'Financial Analysis',
    placeholder: 'Historical financials, projections, burn rate, runway, unit economics, and key financial metrics...'
  },
  {
    key: 'investment_thesis',
    title: 'Investment Thesis',
    placeholder: 'Why this is a compelling investment opportunity, alignment with fund thesis, and potential returns...'
  },
  {
    key: 'use_of_funds',
    title: 'Use of Funds',
    placeholder: 'Detailed breakdown of how the raised capital will be deployed...'
  },
  {
    key: 'risks_mitigation',
    title: 'Risks & Mitigation',
    placeholder: 'Key risks (market, execution, regulatory, competitive) and mitigation strategies...'
  },
  {
    key: 'exit_strategy',
    title: 'Exit Strategy',
    placeholder: 'Potential exit scenarios, comparable exits, timeline, and expected multiples...'
  },
  {
    key: 'recommendation',
    title: 'Investment Recommendation',
    placeholder: 'Clear recommendation (invest/pass), rationale, and any conditions or follow-up required...'
  },
  {
    key: 'proposed_terms',
    title: 'Proposed Terms',
    placeholder: 'Investment amount, valuation, ownership percentage, board seats, and other key terms...'
  }
]

interface InvestmentMemo {
  id: string
  deal_id: string
  content: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  version: number
  created_at: string
  updated_at: string
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

export default function MemoEditPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [memo, setMemo] = useState<InvestmentMemo | null>(null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string>('completed')

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
      setContent(data.content || {})
      setStatus(data.status)
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

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/memos/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, status })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Investment memo updated successfully',
        })
        router.push(`/dashboard/memos/${params.id}`)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update memo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving memo:', error)
      toast({
        title: 'Error',
        description: 'Failed to save memo',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContentChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }))
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/memos/${params.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Memo
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Investment Memo</h1>
            <p className="text-muted-foreground">
              {memo.deal?.company?.name || 'Unknown Company'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Memo Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={memoSections[0].key} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-6 mb-6">
              {memoSections.slice(0, 6).map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="text-xs">
                  {section.title.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground">More Sections:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {memoSections.slice(6).map((section) => (
                  <TabsTrigger 
                    key={section.key} 
                    value={section.key}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    asChild
                  >
                    <Badge variant="outline" className="cursor-pointer">
                      {section.title}
                    </Badge>
                  </TabsTrigger>
                ))}
              </div>
            </div>

            {memoSections.map((section) => (
              <TabsContent key={section.key} value={section.key} className="space-y-4">
                <div>
                  <Label htmlFor={section.key} className="text-lg font-semibold">
                    {section.title}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {section.placeholder}
                  </p>
                </div>
                <Textarea
                  id={section.key}
                  value={content[section.key] || ''}
                  onChange={(e) => handleContentChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                  className="min-h-[400px] font-mono text-sm"
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}