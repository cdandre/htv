import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemoProgressView from '@/components/memo-progress-view'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Investment Memo | HTV',
  description: 'View investment memo',
}

export default async function MemoDetailPage({
  params,
}: {
  params: { memoId: string }
}) {
  const supabase = await createClient()
  
  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get memo details
  const { data: memo, error } = await supabase
    .from('investment_memos')
    .select(`
      *,
      deal:deals(
        *,
        company:companies(*)
      )
    `)
    .eq('id', params.memoId)
    .single()

  if (error || !memo) {
    redirect('/dashboard')
  }

  // Check if user has access to this memo
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', memo.deal.organization_id)
    .single()

  if (!userOrg) {
    redirect('/dashboard')
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
          memoId={params.memoId} 
          onComplete={() => window.location.reload()}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{memo.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date(memo.created_at).toLocaleDateString()} for {memo.deal.company.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <ReactMarkdown>{memo.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}