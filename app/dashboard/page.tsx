import { createClient } from '@/lib/supabase/server'
import DashboardMetrics from '@/components/dashboard-metrics'
import PipelineChart from '@/components/pipeline-chart'
import RecentActivity from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Upload, TrendingUp, Briefcase, BookOpen, ArrowRight } from 'lucide-react'
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
      
      {/* Quick Links - Minimal Design */}
      <div>
        <h2 className="heading-3 text-black dark:text-white mb-6">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/deals" className="group">
            <div className="card-minimal p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <Briefcase className="h-6 w-6 text-black dark:text-white" />
                <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <h3 className="heading-4 text-black dark:text-white mb-2">
                Deal Pipeline
              </h3>
              <p className="body-small text-gray-600 dark:text-gray-400">
                View and manage all deals in your pipeline
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <TrendingUp className="h-4 w-4" />
                {deals?.filter(d => d.stage !== 'closed').length || 0} active deals
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard/memos" className="group">
            <div className="card-minimal p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <FileText className="h-6 w-6 text-black dark:text-white" />
                <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <h3 className="heading-4 text-black dark:text-white mb-2">
                Investment Memos
              </h3>
              <p className="body-small text-gray-600 dark:text-gray-400">
                Generate AI-powered investment memos
              </p>
              <div className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                AI-powered analysis
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard/knowledge" className="group">
            <div className="card-minimal p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <BookOpen className="h-6 w-6 text-black dark:text-white" />
                <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <h3 className="heading-4 text-black dark:text-white mb-2">
                Knowledge Base
              </h3>
              <p className="body-small text-gray-600 dark:text-gray-400">
                Research, insights, and market intelligence
              </p>
              <div className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                Centralized insights
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}