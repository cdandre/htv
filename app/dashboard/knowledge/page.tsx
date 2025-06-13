import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, FileText, TrendingUp, Globe, Users, Lightbulb, BookOpen, Plus, Filter, Clock, Eye } from 'lucide-react'
import Link from 'next/link'

// Mock data for knowledge base articles
const articles = [
  {
    id: '1',
    title: 'AI/ML Investment Thesis 2024',
    category: 'Investment Thesis',
    sector: 'AI/ML',
    author: 'Sarah Chen',
    date: '2024-01-15',
    readTime: '8 min',
    views: 234,
    excerpt: 'Our comprehensive analysis of AI/ML investment opportunities, focusing on enterprise automation, generative AI, and infrastructure plays.',
    tags: ['AI', 'ML', 'Enterprise', 'Infrastructure'],
  },
  {
    id: '2',
    title: 'SaaS Metrics Deep Dive',
    category: 'Analysis Framework',
    sector: 'SaaS',
    author: 'Michael Roberts',
    date: '2024-01-10',
    readTime: '12 min',
    views: 189,
    excerpt: 'Essential SaaS metrics for evaluating investment opportunities: ARR growth, net retention, CAC payback, and efficiency ratios.',
    tags: ['SaaS', 'Metrics', 'Due Diligence'],
  },
  {
    id: '3',
    title: 'Climate Tech Market Map',
    category: 'Market Research',
    sector: 'Climate Tech',
    author: 'Emma Williams',
    date: '2024-01-08',
    readTime: '15 min',
    views: 156,
    excerpt: 'Comprehensive market map of climate tech sectors including carbon capture, renewable energy, and sustainable agriculture.',
    tags: ['Climate', 'Sustainability', 'Market Map'],
  },
  {
    id: '4',
    title: 'Series A Benchmarks 2024',
    category: 'Benchmarks',
    sector: 'General',
    author: 'David Kim',
    date: '2024-01-05',
    readTime: '10 min',
    views: 301,
    excerpt: 'Updated benchmarks for Series A rounds across different sectors: revenue, growth rates, team size, and valuation multiples.',
    tags: ['Series A', 'Benchmarks', 'Valuation'],
  },
  {
    id: '5',
    title: 'Web3 Infrastructure Landscape',
    category: 'Investment Thesis',
    sector: 'Web3',
    author: 'Alex Turner',
    date: '2023-12-28',
    readTime: '14 min',
    views: 178,
    excerpt: 'Deep dive into Web3 infrastructure opportunities: L1/L2 protocols, developer tools, and enterprise blockchain solutions.',
    tags: ['Web3', 'Blockchain', 'Infrastructure'],
  },
]

const categories = [
  { name: 'All', count: articles.length },
  { name: 'Investment Thesis', count: 2 },
  { name: 'Market Research', count: 1 },
  { name: 'Analysis Framework', count: 1 },
  { name: 'Benchmarks', count: 1 },
]

const sectors = [
  { name: 'AI/ML', icon: Lightbulb },
  { name: 'SaaS', icon: Globe },
  { name: 'Climate Tech', icon: TrendingUp },
  { name: 'Web3', icon: Globe },
  { name: 'Healthcare', icon: Users },
]

export default function KnowledgePage() {
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
        <Button size="sm">
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
            <Card key={sector.name} className="hover:border-primary/20 transition-colors cursor-pointer card-hover">
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
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category.name} value={category.name.toLowerCase().replace(' ', '-')}>
              {category.name}
              <span className="ml-1 text-xs text-muted-foreground">({category.count})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {articles.map((article) => (
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
                        {article.readTime}
                      </div>
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {article.views} views
                      </div>
                      <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
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
          ))}
        </TabsContent>

        {/* Other category tabs would show filtered articles */}
        <TabsContent value="investment-thesis">
          <p className="text-muted-foreground">Investment thesis articles...</p>
        </TabsContent>
        
        <TabsContent value="market-research">
          <p className="text-muted-foreground">Market research articles...</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}