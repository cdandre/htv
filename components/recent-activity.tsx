'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, FileText, TrendingUp, Calendar, Star, Clock, Briefcase, Building2, User } from 'lucide-react'
import { Database } from '@/types/database'
import Link from 'next/link'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
  analyst: Database['public']['Tables']['user_profiles']['Row'] | null
}

interface RecentActivityProps {
  deals: Deal[]
}

export default function RecentActivity({ deals }: RecentActivityProps) {
  // Get the 5 most recent deals
  const recentDeals = deals.slice(0, 5)

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getStageLabel = (stage: string) => {
    return stage.replace('_', ' ').charAt(0).toUpperCase() + stage.replace('_', ' ').slice(1)
  }

  return (
    <Card className="card-minimal">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="heading-3 text-black dark:text-white flex items-center gap-3">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Link 
          href="/dashboard/deals" 
          className="text-sm text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
          {recentDeals.map((deal, index) => (
            <Link
              key={deal.id}
              href={`/dashboard/deals/${deal.id}`}
              className="group flex items-start gap-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors -mx-2 px-2"
            >
              {/* Timeline dot */}
              <div className="mt-1.5">
                <div className="w-2 h-2 bg-black dark:bg-white rounded-full" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-black dark:text-white">
                    {deal.company.name}
                  </p>
                  <span className="text-xs uppercase tracking-wider font-medium text-gray-600 dark:text-gray-400">
                    {getStageLabel(deal.stage)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {deal.analyst && (
                    <span>{deal.analyst.full_name}</span>
                  )}
                  <span>{formatDate(deal.created_at)}</span>
                </div>
                
                {(deal.thesis_fit_score || deal.team_score) && (
                  <div className="flex items-center gap-6 mt-2">
                    {deal.thesis_fit_score && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-500">
                          Thesis
                        </span>
                        <span className="text-sm font-medium text-black dark:text-white">
                          {deal.thesis_fit_score}/10
                        </span>
                      </div>
                    )}
                    {deal.team_score && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-500">
                          Team
                        </span>
                        <span className="text-sm font-medium text-black dark:text-white">
                          {deal.team_score}/10
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
          
          {recentDeals.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No recent activity
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Upload deals to see them here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}