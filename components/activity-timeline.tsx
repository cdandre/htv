'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Clock, User, FileText, BarChart3, MessageSquare, Settings, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  action: string
  details: any
  created_at: string
  user: {
    id: string
    full_name: string
    email: string
  }
}

interface ActivityTimelineProps {
  entityType: string
  entityId: string
}

const actionIcons: Record<string, any> = {
  'created': FileText,
  'updated': Settings,
  'analyzed': BarChart3,
  'commented': MessageSquare,
  'uploaded': FileText,
  'generated': FileText,
  'moved': TrendingUp,
  'default': Clock
}

const actionColors: Record<string, string> = {
  'created': 'bg-green-100 text-green-700',
  'updated': 'bg-blue-100 text-blue-700',
  'analyzed': 'bg-purple-100 text-purple-700',
  'commented': 'bg-yellow-100 text-yellow-700',
  'uploaded': 'bg-orange-100 text-orange-700',
  'generated': 'bg-indigo-100 text-indigo-700',
  'moved': 'bg-pink-100 text-pink-700',
  'default': 'bg-gray-100 text-gray-700'
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20
  
  useEffect(() => {
    fetchActivities()
  }, [entityType, entityId])
  
  const fetchActivities = async (loadMore = false) => {
    try {
      const currentOffset = loadMore ? offset : 0
      const response = await fetch(
        `/api/activity?entity_type=${entityType}&entity_id=${entityId}&limit=${limit}&offset=${currentOffset}`
      )
      
      const data = await response.json()
      
      if (response.ok) {
        if (loadMore) {
          setActivities(prev => [...prev, ...(data.activities || [])])
        } else {
          setActivities(data.activities || [])
        }
        setOffset(currentOffset + limit)
        setHasMore((data.activities || []).length === limit)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || actionIcons.default
    return Icon
  }
  
  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default
  }
  
  const formatAction = (activity: Activity) => {
    const userName = activity.user?.full_name || 'Unknown User'
    const action = activity.action
    
    switch (action) {
      case 'created':
        return `${userName} created this ${activity.entity_type}`
      case 'updated':
        return `${userName} updated ${activity.details?.fields?.join(', ') || 'details'}`
      case 'analyzed':
        return `${userName} ran AI analysis`
      case 'generated':
        return `${userName} generated ${activity.details?.type || 'document'}`
      case 'uploaded':
        return `${userName} uploaded ${activity.details?.filename || 'a document'}`
      case 'moved':
        return `${userName} moved to ${activity.details?.to_stage || 'new stage'}`
      case 'commented':
        return `${userName} added a comment`
      default:
        return `${userName} ${action}`
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = getActionIcon(activity.action)
              const colorClass = getActionColor(activity.action)
              
              return (
                <div key={activity.id} className="flex gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {index < activities.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium">
                      {formatAction(activity)}
                    </p>
                    {activity.details?.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        "{activity.details.message}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        •
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchActivities(true)}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}