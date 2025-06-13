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
      <div 
        className="relative overflow-hidden rounded-2xl p-8 text-white shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #ec4899 100%)',
          boxShadow: '0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.1)'
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Welcome to HTV Dashboard
            </h1>
            <p className="text-purple-100 text-lg opacity-90">
              Track your portfolio, analyze deals, and make data-driven decisions.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-6 sm:mt-0">
            <Button 
              asChild 
              variant="secondary" 
              size="default"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
              className="hover:bg-white/30 transition-all duration-200"
            >
              <Link href="/dashboard/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Deck
              </Link>
            </Button>
            <Button 
              asChild 
              size="default"
              style={{
                backgroundColor: 'white',
                color: '#9333ea'
              }}
              className="hover:bg-white/90 transition-all duration-200 font-semibold"
            >
              <Link href="/dashboard/deals/new">
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div 
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" 
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
          style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)' }}
        />
        
        {/* Stats strip */}
        <div 
          className="relative z-10 grid grid-cols-3 gap-4 mt-8 pt-8"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold">{deals?.filter(d => d.stage !== 'closed').length || 0}</p>
            <p className="text-sm opacity-90">Active Deals</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">${((deals?.filter(d => d.stage === 'closed').reduce((sum, d) => sum + (d.check_size_max || 0), 0) || 0) / 1000000).toFixed(1)}M</p>
            <p className="text-sm opacity-90">Portfolio Value</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{deals?.filter(d => d.stage === 'closed').length || 0}</p>
            <p className="text-sm opacity-90">Closed Deals</p>
          </div>
        </div>
      </div>
      
      {/* Metrics Cards with Animation */}
      <div 
        style={{ 
          animationDelay: '100ms',
          animation: 'slide-up 0.6s ease-out forwards',
          opacity: 0
        }}
      >
        <DashboardMetrics deals={deals || []} />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <div 
          className="lg:col-span-4"
          style={{ 
            animationDelay: '200ms',
            animation: 'slide-up 0.6s ease-out forwards',
            opacity: 0
          }}
        >
          <PipelineChart deals={deals || []} />
        </div>
        
        {/* Recent Activity */}
        <div 
          className="lg:col-span-3"
          style={{ 
            animationDelay: '300ms',
            animation: 'slide-up 0.6s ease-out forwards',
            opacity: 0
          }}
        >
          <RecentActivity deals={deals || []} />
        </div>
      </div>
      
      {/* Enhanced Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/deals" className="group">
          <div 
            className="relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
              borderColor: 'rgba(147, 51, 234, 0.1)',
              boxShadow: '0 4px 6px -1px rgba(147, 51, 234, 0.1), 0 2px 4px -1px rgba(147, 51, 234, 0.06)'
            }}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
                  }}
                >
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
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
              style={{
                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
              }}
            />
          </div>
        </Link>
        
        <Link href="/dashboard/memos" className="group">
          <div 
            className="relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.1)',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)'
            }}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                  }}
                >
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
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
              style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
              }}
            />
          </div>
        </Link>
        
        <Link href="/dashboard/knowledge" className="group">
          <div 
            className="relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
              borderColor: 'rgba(34, 197, 94, 0.1)',
              boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)'
            }}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                  }}
                >
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
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)'
              }}
            />
          </div>
        </Link>
      </div>
    </div>
  )
}