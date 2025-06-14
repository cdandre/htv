'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2, Clock, Eye, User, Calendar, Share2, BookmarkPlus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Article {
  id: string
  title: string
  category: string
  sector: string
  author: string
  author_id: string
  created_at: string
  updated_at: string
  read_time: string
  views: number
  excerpt: string
  content: string
  tags: string[]
}

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  useEffect(() => {
    fetchArticle()
  }, [params.id])
  
  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/knowledge/articles/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setArticle(data.article)
      } else {
        throw new Error(data.error || 'Failed to fetch article')
      }
    } catch (error) {
      console.error('Error fetching article:', error)
      toast({
        title: 'Error',
        description: 'Failed to load article',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/knowledge/articles/${params.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: 'Article deleted',
          description: 'The article has been deleted successfully'
        })
        router.push('/dashboard/knowledge')
      } else {
        throw new Error('Failed to delete article')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete article',
        variant: 'destructive'
      })
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!article) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Article not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/dashboard/knowledge')}
        >
          Back to Knowledge Base
        </Button>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <BookmarkPlus className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/dashboard/knowledge/${params.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      {/* Article */}
      <Card>
        <CardHeader className="pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{article.category}</Badge>
              <Badge variant="outline">{article.sector}</Badge>
            </div>
            
            <CardTitle className="text-3xl">{article.title}</CardTitle>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {article.author}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(article.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {article.read_time}
              </div>
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {article.views} views
              </div>
            </div>
            
            {article.excerpt && (
              <p className="text-lg text-muted-foreground italic">
                {article.excerpt}
              </p>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
          
          {article.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}