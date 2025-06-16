'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ExternalLink, Calendar, Tag, Star, StarOff, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ResearchResult {
  title: string
  url: string | null
  snippet: string
  source: string
  published_date: string | null
  tags: string[]
}

interface Favorite extends ResearchResult {
  id: string
  created_at: string
}

export default function ResearchPage() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'general' | 'industry' | 'competitors' | 'market'>('general')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ResearchResult[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [savingFavorite, setSavingFavorite] = useState<string | null>(null)
  const { toast } = useToast()

  // Load favorites on mount
  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true)
      const response = await fetch('/api/research/favorites')
      if (!response.ok) throw new Error('Failed to fetch favorites')
      const data = await response.json()
      setFavorites(data.favorites || [])
    } catch (error) {
      console.error('Error fetching favorites:', error)
      toast({
        title: 'Error',
        description: 'Failed to load favorites',
        variant: 'destructive'
      })
    } finally {
      setLoadingFavorites(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setResults([])

    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, searchType })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      
      if (data.results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try adjusting your search terms',
        })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: 'Search failed',
        description: 'Unable to perform search. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const toggleFavorite = async (item: ResearchResult) => {
    const isFavorited = favorites.some(f => f.url === item.url)
    
    if (isFavorited) {
      // Remove from favorites
      const favorite = favorites.find(f => f.url === item.url)
      if (!favorite) return

      try {
        const response = await fetch(`/api/research/favorites?id=${favorite.id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) throw new Error('Failed to remove favorite')
        
        setFavorites(prev => prev.filter(f => f.id !== favorite.id))
        toast({
          title: 'Removed from favorites',
          description: item.title
        })
      } catch (error) {
        console.error('Error removing favorite:', error)
        toast({
          title: 'Error',
          description: 'Failed to remove from favorites',
          variant: 'destructive'
        })
      }
    } else {
      // Add to favorites
      setSavingFavorite(item.url || item.title)
      
      try {
        const response = await fetch('/api/research/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save favorite')
        }
        
        const { favorite } = await response.json()
        setFavorites(prev => [favorite, ...prev])
        toast({
          title: 'Added to favorites',
          description: item.title
        })
      } catch (error: any) {
        console.error('Error saving favorite:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to save favorite',
          variant: 'destructive'
        })
      } finally {
        setSavingFavorite(null)
      }
    }
  }

  const getTagColor = (tag: string) => {
    const colors = {
      'funding': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'proptech': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'ai': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'sustainability': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'policy': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'market-analysis': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    } as const
    
    return colors[tag as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  const ResultCard = ({ item, isFavorite = false }: { item: ResearchResult | Favorite, isFavorite?: boolean }) => {
    const isSaved = favorites.some(f => f.url === item.url)
    const isSaving = savingFavorite === (item.url || item.title)
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight">
                {item.url ? (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary flex items-start gap-2 group"
                  >
                    <span className="break-words">{item.title}</span>
                    <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <span className="break-words">{item.title}</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {item.source && (
                  <span className="truncate">{item.source}</span>
                )}
                {item.published_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(item.published_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleFavorite(item)}
              disabled={isSaving}
              className={cn(
                "transition-colors",
                isSaved && "text-yellow-600 hover:text-yellow-700"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {item.snippet}
          </p>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary"
                  className={cn("text-xs", getTagColor(tag))}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {isFavorite && 'created_at' in item && (
            <p className="text-xs text-muted-foreground mt-3">
              Saved {format(new Date(item.created_at), 'MMM d, yyyy')}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Research Hub</h1>
        <p className="text-muted-foreground">
          Discover the latest venture capital news, market insights, and industry trends
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="favorites">
            Favorites {favorites.length > 0 && `(${favorites.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Search for companies, trends, technologies, or market insights..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={searching}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={searching || !query.trim()}>
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Search type:</span>
                  {(['general', 'industry', 'competitors', 'market'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={searchType === type ? 'default' : 'outline'}
                      onClick={() => setSearchType(type)}
                      className="capitalize"
                    >
                      {type === 'general' ? 'All' : type}
                    </Button>
                  ))}
                </div>
              </form>
            </CardContent>
          </Card>

          {searching && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Searching the web for relevant content...</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Search Results ({results.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResults([])}
                >
                  Clear
                </Button>
              </div>
              
              <div className="grid gap-4">
                {results.map((result, idx) => (
                  <ResultCard key={idx} item={result} />
                ))}
              </div>
            </div>
          )}

          {!searching && query && results.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">
                  Try different search terms or adjust your search type
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          {loadingFavorites ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : favorites.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Saved Articles ({favorites.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchFavorites}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="grid gap-4">
                {favorites.map((favorite) => (
                  <ResultCard key={favorite.id} item={favorite} isFavorite />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No favorites yet</p>
                <p className="text-sm text-muted-foreground">
                  Search for articles and save your favorites for quick access
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}