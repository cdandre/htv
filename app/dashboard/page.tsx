import { createClient } from '@/lib/supabase/server'
import DashboardMetrics from '@/components/dashboard-metrics'
import PipelineChart from '@/components/pipeline-chart'
import RecentActivity from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Upload, TrendingUp, Briefcase, BookOpen, Sparkles, ArrowUpRight } from 'lucide-react'
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
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 p-8 text-white">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Welcome to HTV Dashboard
            </h1>
            <p className="text-purple-100 text-lg">
              Track your portfolio, analyze deals, and make data-driven decisions.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-6 sm:mt-0">
            <Button 
              asChild 
              variant="secondary" 
              size="default"
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border-white/20"
            >
              <Link href="/dashboard/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Deck
              </Link>
            </Button>
            <Button 
              asChild 
              size="default"
              className="bg-white text-purple-700 hover:bg-white/90"
            >
              <Link href="/dashboard/deals/new">
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Stats strip */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/20">
          <div className="text-center">
            <p className="text-3xl font-bold">{deals?.filter(d => d.stage !== 'closed').length || 0}</p>
            <p className="text-sm text-purple-100">Active Deals</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">${((deals?.filter(d => d.stage === 'closed').reduce((sum, d) => sum + (d.check_size_max || 0), 0) || 0) / 1000000).toFixed(1)}M</p>
            <p className="text-sm text-purple-100">Portfolio Value</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{deals?.filter(d => d.stage === 'closed').length || 0}</p>
            <p className="text-sm text-purple-100">Closed Deals</p>
          </div>
        </div>
      </div>
      
      {/* Metrics Cards with Animation */}
      <div className="animate-in" style={{ animationDelay: '100ms' }}>
        <DashboardMetrics deals={deals || []} />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <div className="lg:col-span-4 animate-in" style={{ animationDelay: '200ms' }}>
          <PipelineChart deals={deals || []} />
        </div>
        
        {/* Recent Activity */}
        <div className="lg:col-span-3 animate-in" style={{ animationDelay: '300ms' }}>
          <RecentActivity deals={deals || []} />
        </div>
      </div>
      
      {/* Enhanced Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/deals" className="group">
          <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 card-hover">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                Deal Pipeline
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage all deals in your pipeline
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <TrendingUp className="h-4 w-4" />
                {deals?.filter(d => d.stage !== 'closed').length || 0} active deals
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        </Link>
        
        <Link href="/dashboard/memos" className="group">
          <div className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 card-hover">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                Investment Memos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate AI-powered investment memos
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4 w-4" />
                AI-powered analysis
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        </Link>
        
        <Link href="/dashboard/knowledge" className="group">
          <div className="relative overflow-hidden p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-100 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 card-hover">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                Knowledge Base
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Research, insights, and market intelligence
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <BookOpen className="h-4 w-4" />
                Centralized insights
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        </Link>
      </div>
    </div>
  )
}