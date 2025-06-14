'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, Calendar, Building2, ChevronRight, Loader2, Trash2, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
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
  title: string
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
      sector_id: string | null
    }
  }
}

// Strip markdown formatting for preview
function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^[-*+]\s/gm, '') // Remove bullet points
    .replace(/^\d+\.\s/gm, '') // Remove numbered lists
    .replace(/\n{2,}/g, ' ') // Replace multiple newlines with space
    .replace(/\n/g, ' ') // Replace single newlines with space
    .trim()
}

export default function MemosPage() {
  const { toast } = useToast()
  const [memos, setMemos] = useState<InvestmentMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [memoToDelete, setMemoToDelete] = useState<InvestmentMemo | null>(null)
  
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
  
  const handleDeleteMemo = async () => {
    if (!memoToDelete) return
    
    try {
      setDeletingMemoId(memoToDelete.id)
      const response = await fetch(`/api/memos/${memoToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Investment memo deleted successfully',
        })
        setMemos(memos.filter(m => m.id !== memoToDelete.id))
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
      setDeletingMemoId(null)
      setShowDeleteDialog(false)
      setMemoToDelete(null)
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
                  <Badge variant={memo.status === 'completed' ? 'default' : memo.status === 'failed' ? 'destructive' : 'secondary'}>
                    {memo.status === 'completed' ? 'Completed' : 
                     memo.status === 'processing' ? 'Processing' : 
                     memo.status === 'failed' ? 'Failed' : 'Pending'}
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
                        {stripMarkdown(memo.content.executive_summary)}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      asChild 
                      variant="outline" 
                      className="flex-1"
                    >
                      <Link href={`/dashboard/memos/${memo.id}`}>
                        View Memo
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/memos/${memo.id}/edit`}>
                            Edit Memo
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setMemoToDelete(memo)
                            setShowDeleteDialog(true)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Memo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment Memo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the investment memo for {memoToDelete?.deal?.company?.name || 'this company'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingMemoId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMemo}
              disabled={!!deletingMemoId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingMemoId ? (
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