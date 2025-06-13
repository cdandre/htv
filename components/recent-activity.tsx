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
        return { icon: FileText, gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)' }
      case 'signals':
        return { icon: TrendingUp, gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' }
      case 'validation':
        return { icon: Briefcase, gradient: 'linear-gradient(135deg, #facc15 0%, #d97706 100%)' }
      case 'conviction':
        return { icon: Star, gradient: 'linear-gradient(135deg, #4ade80 0%, #10b981 100%)' }
      case 'term_sheet':
        return { icon: FileText, gradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)' }
      case 'due_diligence':
        return { icon: Calendar, gradient: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' }
      case 'closed':
        return { icon: Star, gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' }
      default:
        return { icon: Calendar, gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' }
    }
  }

  const getStageStyles = (stage: string) => {
    const styles: Record<string, { bg: string, color: string }> = {
      'thesis_fit': { bg: 'rgba(241, 245, 249, 1)', color: '#475569' },
      'signals': { bg: 'rgba(219, 234, 254, 1)', color: '#2563eb' },
      'validation': { bg: 'rgba(254, 243, 199, 1)', color: '#d97706' },
      'conviction': { bg: 'rgba(220, 252, 231, 1)', color: '#16a34a' },
      'term_sheet': { bg: 'rgba(243, 232, 255, 1)', color: '#9333ea' },
      'due_diligence': { bg: 'rgba(224, 231, 255, 1)', color: '#6366f1' },
      'closed': { bg: 'rgba(252, 231, 243, 1)', color: '#ec4899' },
    }
    return styles[stage] || { bg: 'rgba(243, 244, 246, 1)', color: '#6b7280' }
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
    <Card 
      className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <div 
            className="p-2 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)'
            }}
          >
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
            const { icon: Icon, gradient } = getActivityIcon(deal.stage)
            const stageStyles = getStageStyles(deal.stage)
            return (
              <Link
                key={deal.id}
                href={`/dashboard/deals/${deal.id}`}
                className="group relative flex items-start gap-4 p-4 -mx-2 rounded-xl transition-all duration-200"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'slide-up 0.5s ease-out forwards',
                  opacity: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(249, 250, 251, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {/* Timeline line */}
                {index < recentDeals.length - 1 && (
                  <div 
                    className="absolute left-6 top-14 bottom-0 w-0.5"
                    style={{ backgroundColor: 'rgba(229, 231, 235, 1)' }}
                  />
                )}
                
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                    style={{ background: gradient }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2"
                    style={{ 
                      backgroundColor: 'white',
                      borderColor: 'rgba(229, 231, 235, 1)'
                    }}
                  />
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
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: stageStyles.bg,
                        color: stageStyles.color
                      }}
                    >
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
                          <div 
                            className="rounded-full h-1.5 w-20"
                            style={{ backgroundColor: 'rgba(229, 231, 235, 1)' }}
                          >
                            <div 
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${(deal.thesis_fit_score / 10) * 100}%`,
                                background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)'
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {deal.thesis_fit_score}/10
                          </span>
                        </div>
                      )}
                      {deal.team_score && (
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="rounded-full h-1.5 w-20"
                            style={{ backgroundColor: 'rgba(229, 231, 235, 1)' }}
                          >
                            <div 
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${(deal.team_score / 10) * 100}%`,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)'
                              }}
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