import { createClient } from '@/lib/supabase/server'
import DealPipeline from '@/components/deal-pipeline'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: deals } = await supabase
    .from('deals')
    .select(`
      *,
      company:companies(*),
      analyst:user_profiles!deals_analyst_id_fkey(*),
      partner:user_profiles!deals_partner_id_fkey(*)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track deals through your investment process
        </p>
      </div>
      
      <DealPipeline deals={deals || []} />
    </div>
  )
}