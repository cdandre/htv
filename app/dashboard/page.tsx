import { createClient } from '@/lib/supabase/server'
import DashboardMetrics from '@/components/dashboard-metrics'
import PipelineChart from '@/components/pipeline-chart'
import RecentActivity from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Upload } from 'lucide-react'
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
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your portfolio overview.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Deck
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/deals/new">
              <Plus className="mr-2 h-4 w-4" />
              New Deal
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <DashboardMetrics deals={deals || []} />
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <div className="lg:col-span-4">
          <PipelineChart deals={deals || []} />
        </div>
        
        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <RecentActivity deals={deals || []} />
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/deals" className="group">
          <div className="p-6 bg-card rounded-lg border hover:border-primary transition-all card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Deal Pipeline</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage all deals
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/memos" className="group">
          <div className="p-6 bg-card rounded-lg border hover:border-primary transition-all card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Investment Memos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate and review memos
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboard/knowledge" className="group">
          <div className="p-6 bg-card rounded-lg border hover:border-primary transition-all card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Knowledge Base</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Research and insights
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}