import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DealDetail from '@/components/deal-detail'

interface PageProps {
  params: {
    id: string
  }
}

export default async function DealPage({ params }: PageProps) {
  const supabase = await createClient()
  
  const { data: deal } = await supabase
    .from('deals')
    .select(`
      *,
      company:companies(*),
      documents(*),
      deal_analyses(*),
      investment_memos(*)
    `)
    .eq('id', params.id)
    .single()

  if (!deal) {
    notFound()
  }

  return <DealDetail deal={deal} />
}