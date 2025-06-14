'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, Calendar, Building2, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

interface InvestmentMemo {
  id: string
  deal_id: string
  title: string
  content: any
  status: 'draft' | 'final' | 'completed'
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
      sector_id: string | null
    }
  }
}

export default function MemosPage() {
  const { toast } = useToast()
  const [memos, setMemos] = useState<InvestmentMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  useEffect(() => {
    fetchMemos()
  }, [])
  
  const fetchMemos = async () => {
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
              name,
              sector_id
            )
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setMemos(data || [])
    } catch (error) {
      console.error('Error fetching memos:', error)
      toast({
        title: 'Error',
        description: 'Failed to load investment memos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const filteredMemos = memos.filter(memo => {
    const matchesSearch = searchQuery === '' || 
      memo.deal?.company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.deal?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || memo.status === statusFilter
    
    return matchesSearch && matchesStatus
  })
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investment Memos</h1>
        <p className="text-muted-foreground">
          Generated investment memos for deals in the pipeline
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Memos</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Memos Grid */}
      {filteredMemos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No investment memos found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Generate your first investment memo from the deals page'}
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Button asChild variant="outline">
                <Link href="/dashboard/deals">
                  Browse Deals
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemos.map((memo) => (
            <Card key={memo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {memo.deal?.company?.name || memo.title || 'Unknown Company'}
                      </CardTitle>
                      <CardDescription>
                        {memo.deal?.title || 'Investment Memo'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={memo.status === 'completed' ? 'default' : memo.status === 'final' ? 'default' : 'secondary'}>
                    {memo.status === 'completed' ? 'Completed' : memo.status === 'final' ? 'Final' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stage</span>
                    <span className="font-medium capitalize">
                      {memo.deal?.stage?.replace(/_/g, ' ') || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">v{memo.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {format(new Date(memo.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  {/* Preview of executive summary */}
                  {memo.content?.executive_summary && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {memo.content.executive_summary}
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full mt-4"
                  >
                    <Link href={`/dashboard/memos/${memo.id}`}>
                      View Memo
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}