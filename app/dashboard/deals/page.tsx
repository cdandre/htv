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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all deals through your investment process
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/deals/new">
              <Plus className="mr-2 h-4 w-4" />
              New Deal
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Deal Pipeline Component */}
      <DealPipeline deals={deals || []} />
    </div>
  )
}