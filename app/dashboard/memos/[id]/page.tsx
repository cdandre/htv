'use client'

import { useEffect, useState } from 'react'
import { redirect, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MemoProgressView from '@/components/memo-progress-view'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { MemoStyles } from '@/components/memo-styles'

export default function MemoDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [memo, setMemo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMemo()
  }, [params.id])

  const fetchMemo = async () => {
    try {
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get memo details
      const { data: memoData, error: memoError } = await supabase
        .from('investment_memos')
        .select(`
          *,
          deal:deals(
            *,
            company:companies(*)
          )
        `)
        .eq('id', params.id)
        .single()

      if (memoError) {
        throw memoError
      }

      if (!memoData) {
        router.push('/dashboard')
        return
      }

      // Check if user has access to this memo
      const { data: userOrg } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .eq('organization_id', memoData.deal.organization_id)
        .single()

      if (!userOrg) {
        router.push('/dashboard')
        return
      }

      setMemo(memoData)
    } catch (err: any) {
      console.error('Error fetching memo:', err)
      setError(err.message || 'Failed to fetch memo')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!memo) {
    return null
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/dashboard/deals/${memo.deal.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deal
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {memo.generation_status === 'generating' || memo.generation_status === 'pending' ? (
        <MemoProgressView 
          memoId={params.id} 
          onComplete={() => fetchMemo()}
        />
      ) : (
        <>
          <MemoStyles />
          <Card className="shadow-lg">
            <CardContent className="p-8 md:p-12">
              {memo.content ? (
                <div className="memo-content">
                  <ReactMarkdown>{memo.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    The memo generation completed but no content was found.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/dashboard/deals/${memo.deal.id}`)}
                  >
                    Back to Deal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}