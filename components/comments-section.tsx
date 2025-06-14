'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageSquare, Send, Edit2, Trash2, MoreVertical, 
  Reply, Loader2, AlertCircle 
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  content: string
  created_at: string
  is_edited: boolean
  edited_at: string | null
  user: {
    id: string
    full_name: string
    email: string
  }
  replies?: Comment[]
}

interface CommentsSectionProps {
  entityType: string
  entityId: string
}

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  useEffect(() => {
    loadComments()
    getCurrentUser()
  }, [entityType, entityId])
  
  const getCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }
  
  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/comments?entity_type=${entityType}&entity_id=${entityId}`
      )
      
      const data = await response.json()
      
      if (response.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const postComment = async (parentId?: string) => {
    const commentContent = parentId ? replyContent : content
    
    if (!commentContent.trim()) return
    
    try {
      setPosting(true)
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: commentContent,
          parent_id: parentId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (parentId) {
          setReplyContent('')
          setReplyingTo(null)
        } else {
          setContent('')
        }
        await loadComments()
        toast({
          title: 'Comment posted',
          description: 'Your comment has been added'
        })
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive'
      })
    } finally {
      setPosting(false)
    }
  }
  
  const updateComment = async (commentId: string) => {
    if (!editContent.trim()) return
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
      
      if (response.ok) {
        setEditingId(null)
        setEditContent('')
        await loadComments()
        toast({
          title: 'Comment updated',
          description: 'Your comment has been edited'
        })
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive'
      })
    }
  }
  
  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadComments()
        toast({
          title: 'Comment deleted',
          description: 'Your comment has been removed'
        })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      })
    }
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingId === comment.id
    const isOwner = comment.user.id === currentUserId
    
    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback>{getInitials(comment.user.full_name)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{comment.user.full_name}</p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
            
            {isOwner && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditingId(comment.id)
                    setEditContent(comment.content)
                  }}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteComment(comment.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateComment(comment.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null)
                    setEditContent('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
              
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs"
                  onClick={() => {
                    setReplyingTo(comment.id)
                    setReplyContent('')
                  }}
                >
                  <Reply className="mr-1 h-3 w-3" />
                  Reply
                </Button>
              )}
            </>
          )}
          
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => postComment(comment.id)}
                  disabled={posting}
                >
                  {posting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyContent('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    )
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
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New comment form */}
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Use @name to mention team members
            </p>
            <Button onClick={() => postComment()} disabled={posting || !content.trim()}>
              {posting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
        
        {/* Comments list */}
        {comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map(comment => renderComment(comment))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No comments yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share your thoughts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}