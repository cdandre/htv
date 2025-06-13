import { createClient } from '@/lib/supabase/server'
import DealPipeline from '@/components/deal-pipeline'
import { Button } from '@/components/ui/button'
import { Plus, Filter, Download } from 'lucide-react'
import Link from 'next/link'

export default async function DealsPage() {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-1 text-black dark:text-white">Deal Pipeline</h1>
            <p className="body-large text-gray-600 dark:text-gray-400 mt-2">
              Manage and track all deals through your investment process
            </p>
          </div>
          <div className="flex items-center gap-3 mt-6 sm:mt-0">
            <Button variant="outline" size="default" className="border-gray-300 dark:border-gray-700">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" size="default" className="border-gray-300 dark:border-gray-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/dashboard/deals/new">
              <Button size="default" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Deal Pipeline Component */}
      <DealPipeline deals={deals || []} />
    </div>
  )
}