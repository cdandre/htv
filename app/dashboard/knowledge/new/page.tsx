'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function NewArticlePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [sector, setSector] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  
  const categories = [
    'Investment Thesis',
    'Market Research',
    'Analysis Framework',
    'Benchmarks',
    'Case Study',
    'Industry Update'
  ]
  
  const sectors = [
    'AI/ML',
    'SaaS',
    'Climate Tech',
    'Web3',
    'Healthcare',
    'FinTech',
    'EdTech',
    'E-commerce',
    'General'
  ]
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  const handleSave = async () => {
    if (!title || !category || !sector || !content) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch('/api/knowledge/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          sector,
          content,
          excerpt: excerpt || content.substring(0, 200) + '...',
          tags
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Article created',
          description: 'Your article has been published successfully'
        })
        router.push(`/dashboard/knowledge/${data.article.id}`)
      } else {
        throw new Error(data.error || 'Failed to create article')
      }
    } catch (error) {
      console.error('Error creating article:', error)
      toast({
        title: 'Error',
        description: 'Failed to create article. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Article</h1>
            <p className="text-muted-foreground">Create a new knowledge base article</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
      
      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExcerpt(e.target.value)}
                  placeholder="Brief summary of the article (optional)..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  placeholder="Write your article content..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sector">Sector *</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tags..."
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Word count:</strong> {content.split(' ').filter(Boolean).length}</p>
                <p><strong>Read time:</strong> {Math.ceil(content.split(' ').filter(Boolean).length / 200)} min</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}