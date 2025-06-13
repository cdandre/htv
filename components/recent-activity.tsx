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

  const getActivityIcon = (stage: string) => {
    switch (stage) {
      case 'thesis_fit':
        return { icon: FileText, color: 'from-slate-400 to-slate-600' }
      case 'signals':
        return { icon: TrendingUp, color: 'from-blue-400 to-blue-600' }
      case 'validation':
        return { icon: Briefcase, color: 'from-yellow-400 to-amber-600' }
      case 'conviction':
        return { icon: Star, color: 'from-green-400 to-emerald-600' }
      case 'term_sheet':
        return { icon: FileText, color: 'from-purple-400 to-purple-600' }
      case 'due_diligence':
        return { icon: Calendar, color: 'from-indigo-400 to-indigo-600' }
      case 'closed':
        return { icon: Star, color: 'from-pink-400 to-pink-600' }
      default:
        return { icon: Calendar, color: 'from-gray-400 to-gray-600' }
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'thesis_fit': 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
      'signals': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      'validation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      'conviction': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      'term_sheet': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
      'due_diligence': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
      'closed': 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
    }
    return colors[stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
  }

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

  return (
    <Card className="card-hover bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <Clock className="h-5 w-5 text-white" />
          </div>
          Recent Activity
        </CardTitle>
        <Link 
          href="/dashboard/deals" 
          className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-1">
          {recentDeals.map((deal, index) => {
            const { icon: Icon, color } = getActivityIcon(deal.stage)
            return (
              <Link
                key={deal.id}
                href={`/dashboard/deals/${deal.id}`}
                className="group relative flex items-start gap-4 p-4 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'slide-up 0.5s ease-out forwards'
                }}
              >
                {/* Timeline line */}
                {index < recentDeals.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}
                
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {deal.company.name}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(deal.stage)}`}>
                      {deal.stage.replace('_', ' ').charAt(0).toUpperCase() + deal.stage.replace('_', ' ').slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    {deal.analyst && (
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span>{deal.analyst.full_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(deal.created_at)}</span>
                    </div>
                  </div>
                  
                  {(deal.thesis_fit_score || deal.team_score) && (
                    <div className="flex items-center gap-4 mt-2">
                      {deal.thesis_fit_score && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 w-20">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(deal.thesis_fit_score / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {deal.thesis_fit_score}/10
                          </span>
                        </div>
                      )}
                      {deal.team_score && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 w-20">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(deal.team_score / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {deal.team_score}/10
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          
          {recentDeals.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No recent activity
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Upload deals to see them here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}