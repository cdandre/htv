'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, FileText, TrendingUp, Globe, Users, Lightbulb, BookOpen, Plus, Filter, Clock, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'


interface Article {
  id: string
  title: string
  category: string
  sector: string
  author: string
  created_at: string
  read_time: string
  views: number
  excerpt: string
  tags: string[]
}

const sectors = [
  { name: 'AI/ML', icon: Lightbulb },
  { name: 'SaaS', icon: Globe },
  { name: 'Climate Tech', icon: TrendingUp },
  { name: 'Web3', icon: Globe },
  { name: 'Healthcare', icon: Users },
]

export default function KnowledgePage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  
  const categories = [
    { name: 'All', value: 'all' },
    { name: 'Investment Thesis', value: 'Investment Thesis' },
    { name: 'Market Research', value: 'Market Research' },
    { name: 'Analysis Framework', value: 'Analysis Framework' },
    { name: 'Benchmarks', value: 'Benchmarks' },
  ]
  
  useEffect(() => {
    fetchArticles()
  }, [selectedCategory, selectedSector])
  
  const fetchArticles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      if (selectedSector) {
        params.append('sector', selectedSector)
      }
      
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      
      const response = await fetch(`/api/knowledge/articles?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setArticles(data.articles || [])
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchArticles()
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setArticles(data.results || [])
      }
    } catch (error) {
      console.error('Error searching articles:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateArticle = () => {
    router.push('/dashboard/knowledge/new')
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Research, frameworks, and insights from the team
          </p>
        </div>
        <Button size="sm" onClick={handleCreateArticle}>
          <Plus className="mr-2 h-4 w-4" />
          New Article
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, topics, or authors..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Quick Access Sectors */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {sectors.map((sector) => {
          const Icon = sector.icon
          return (
            <Card 
              key={sector.name} 
              className="hover:border-primary/20 transition-colors cursor-pointer card-hover"
              onClick={() => {
                setSelectedSector(selectedSector === sector.name ? null : sector.name)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{sector.name}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.name}
              <span className="ml-1 text-xs text-muted-foreground">
                ({category.value === 'all' ? articles.length : articles.filter((a: Article) => a.category === category.value).length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No articles found matching your search.' : 'No articles available yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            articles.map((article: Article) => (
            <Card key={article.id} className="hover:border-primary/20 transition-all card-hover">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{article.category}</Badge>
                        <Badge variant="outline">{article.sector}</Badge>
                      </div>
                      <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                        <Link href={`/dashboard/knowledge/${article.id}`}>
                          {article.title}
                        </Link>
                      </h3>
                    </div>
                    
                    <p className="text-muted-foreground">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {article.author}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {article.read_time}
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {article.views} views
                      </div>
                      <span>{new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="ml-6 flex-shrink-0">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}