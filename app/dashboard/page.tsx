import { createClient } from '@/lib/supabase/server'
import DashboardMetrics from '@/components/dashboard-metrics'
import PipelineChart from '@/components/pipeline-chart'
import RecentActivity from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Plus, Upload } from 'lucide-react'
import Link from 'next/link'

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
    <div className="space-y-12">
      {/* Minimal Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-8">
        <h1 className="heading-1 text-black dark:text-white mb-4">
          Dashboard
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <p className="body-large text-gray-600 dark:text-gray-400 mb-6 sm:mb-0">
            Track your portfolio performance and deal pipeline.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/upload">
              <Button 
                variant="outline" 
                size="default"
                className="btn-secondary border-gray-300 dark:border-gray-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Deck
              </Button>
            </Link>
            <Link href="/dashboard/deals/new">
              <Button 
                size="default"
                className="btn-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Key Stats - Minimal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
          <div>
            <p className="metric-value text-black dark:text-white">
              {deals?.filter(d => d.stage !== 'closed').length || 0}
            </p>
            <p className="metric-label">Active Deals</p>
          </div>
          <div>
            <p className="metric-value text-black dark:text-white">
              ${((deals?.filter(d => d.stage === 'closed').reduce((sum, d) => sum + (d.check_size_max || 0), 0) || 0) / 1000000).toFixed(1)}M
            </p>
            <p className="metric-label">Portfolio Value</p>
          </div>
          <div>
            <p className="metric-value text-black dark:text-white">
              {deals?.filter(d => d.stage === 'closed').length || 0}
            </p>
            <p className="metric-label">Closed Deals</p>
          </div>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className="animate-fade-in">
        <DashboardMetrics deals={deals || []} />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <div className="lg:col-span-4 animate-slide-in">
          <PipelineChart deals={deals || []} />
        </div>
        
        {/* Recent Activity */}
        <div className="lg:col-span-3 animate-slide-in" style={{ animationDelay: '100ms' }}>
          <RecentActivity deals={deals || []} />
        </div>
      </div>
      
    </div>
  )
}