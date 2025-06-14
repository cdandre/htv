'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Clock, FileText, TrendingUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  is_read: boolean
  created_at: string
}

const typeIcons: Record<string, any> = {
  'deal_created': FileText,
  'deal_updated': FileText,
  'deal_stage_changed': TrendingUp,
  'analysis_completed': TrendingUp,
  'memo_generated': FileText,
  'document_uploaded': FileText,
  'comment_added': MessageSquare,
  'default': Bell
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      const data = await response.json()
      
      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      })
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }
  
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    if (notification.action_url) {
      router.push(notification.action_url)
    }
    
    setIsOpen(false)
  }
  
  const getIcon = (type: string) => {
    const Icon = typeIcons[type] || typeIcons.default
    return Icon
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type)
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-4 cursor-pointer ${!notification.is_read ? 'bg-muted/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3 w-full">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      !notification.is_read ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Icon className={`w-5 h-5 ${!notification.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary"
              onClick={() => {
                router.push('/dashboard/notifications')
                setIsOpen(false)
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}