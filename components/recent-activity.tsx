'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, FileText, TrendingUp, Calendar, Star } from 'lucide-react'
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
        return <FileText className="h-4 w-4" />
      case 'signals':
      case 'validation':
        return <TrendingUp className="h-4 w-4" />
      case 'conviction':
      case 'term_sheet':
        return <Star className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'thesis_fit':
        return 'default'
      case 'signals':
        return 'info'
      case 'validation':
        return 'warning'
      case 'conviction':
      case 'term_sheet':
        return 'success'
      case 'due_diligence':
        return 'secondary'
      case 'closed':
        return 'success'
      default:
        return 'default'
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Link href="/dashboard/deals" className="text-sm text-primary hover:underline flex items-center">
          View all
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentDeals.map((deal) => (
            <Link
              key={deal.id}
              href={`/dashboard/deals/${deal.id}`}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                {getActivityIcon(deal.stage)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{deal.company.name}</p>
                  <Badge variant={getStageColor(deal.stage) as any} className="text-xs">
                    {deal.stage.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {deal.analyst ? `${deal.analyst.full_name} • ` : ''}
                  {formatDate(deal.created_at)}
                </p>
                {(deal.thesis_fit_score || deal.team_score) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {deal.thesis_fit_score && (
                      <span>Thesis: {deal.thesis_fit_score}/10</span>
                    )}
                    {deal.team_score && (
                      <span>Team: {deal.team_score}/10</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
          
          {recentDeals.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}