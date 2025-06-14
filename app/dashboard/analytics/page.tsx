'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, 
  Clock, Building2, FileText, Loader2, Download, Calendar
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// Define color palette
const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC']

interface DashboardMetrics {
  totalDeals: number
  totalValue: number
  avgDealSize: number
  conversionRate: number
  avgTimeInStage: number
  activeDeals: number
  closedDeals: number
  lostDeals: number
}

interface StageDistribution {
  stage: string
  count: number
  value: number
}

interface TimeSeriesData {
  date: string
  deals: number
  value: number
}

interface SectorBreakdown {
  sector: string
  count: number
  value: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDeals: 0,
    totalValue: 0,
    avgDealSize: 0,
    conversionRate: 0,
    avgTimeInStage: 0,
    activeDeals: 0,
    closedDeals: 0,
    lostDeals: 0
  })
  const [stageDistribution, setStageDistribution] = useState<StageDistribution[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [sectorBreakdown, setSectorBreakdown] = useState<SectorBreakdown[]>([])
  
  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])
  
  const getDateRange = () => {
    const end = new Date()
    let start = new Date()
    
    switch (timeRange) {
      case '7d':
        start = subDays(end, 7)
        break
      case '30d':
        start = subDays(end, 30)
        break
      case '90d':
        start = subDays(end, 90)
        break
      case 'ytd':
        start = new Date(end.getFullYear(), 0, 1)
        break
      default:
        start = subDays(end, 30)
    }
    
    return { start, end }
  }
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { start, end } = getDateRange()
      
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile) return
      
      // Fetch all deals for the organization
      const { data: deals } = await supabase
        .from('deals')
        .select('*, company:companies(*)')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
      
      if (!deals) return
      
      // Calculate metrics
      const activeDeals = deals.filter(d => !['closed', 'lost'].includes(d.stage))
      const closedDeals = deals.filter(d => d.stage === 'closed')
      const lostDeals = deals.filter(d => d.stage === 'lost')
      
      const totalValue = deals.reduce((sum, d) => sum + (d.valuation || 0), 0)
      const avgDealSize = deals.length > 0 ? totalValue / deals.length : 0
      const conversionRate = deals.length > 0 ? (closedDeals.length / deals.length) * 100 : 0
      
      // Calculate average time in stage
      let avgTimeInStage = 0
      if (deals.length > 0) {
        const dealAges = deals.map(deal => {
          const created = new Date(deal.created_at)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - created.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays
        })
        avgTimeInStage = Math.round(dealAges.reduce((sum, age) => sum + age, 0) / dealAges.length)
      }
      
      setMetrics({
        totalDeals: deals.length,
        totalValue,
        avgDealSize,
        conversionRate,
        avgTimeInStage,
        activeDeals: activeDeals.length,
        closedDeals: closedDeals.length,
        lostDeals: lostDeals.length
      })
      
      // Stage distribution
      const stages = ['thesis_fit', 'signals', 'validation', 'conviction', 'term_sheet', 'due_diligence', 'closed']
      const stageData = stages.map(stage => ({
        stage: stage.replace('_', ' ').toUpperCase(),
        count: deals.filter(d => d.stage === stage).length,
        value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.valuation || 0), 0)
      }))
      setStageDistribution(stageData)
      
      // Time series data (simplified - group by week)
      const timeData: TimeSeriesData[] = []
      const current = new Date(start)
      while (current <= end) {
        const weekEnd = new Date(current)
        weekEnd.setDate(weekEnd.getDate() + 7)
        
        const weekDeals = deals.filter(d => {
          const dealDate = new Date(d.created_at)
          return dealDate >= current && dealDate < weekEnd
        })
        
        timeData.push({
          date: format(current, 'MMM d'),
          deals: weekDeals.length,
          value: weekDeals.reduce((sum, d) => sum + (d.valuation || 0), 0)
        })
        
        current.setDate(current.getDate() + 7)
      }
      setTimeSeriesData(timeData)
      
      // Sector breakdown
      const sectorMap = new Map<string, { count: number, value: number }>()
      deals.forEach(deal => {
        const sector = deal.sector || 'Other'
        const current = sectorMap.get(sector) || { count: 0, value: 0 }
        sectorMap.set(sector, {
          count: current.count + 1,
          value: current.value + (deal.valuation || 0)
        })
      })
      
      const sectorData = Array.from(sectorMap.entries()).map(([sector, data]) => ({
        sector,
        ...data
      }))
      setSectorBreakdown(sectorData)
      
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }
  
  const exportData = () => {
    // Prepare CSV data
    const csvRows = []
    
    // Add headers
    csvRows.push(['Analytics Report', `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`])
    csvRows.push(['Time Range', timeRange])
    csvRows.push([])
    
    // Add metrics
    csvRows.push(['Key Metrics'])
    csvRows.push(['Total Deals', metrics.totalDeals])
    csvRows.push(['Active Deals', metrics.activeDeals])
    csvRows.push(['Closed Deals', metrics.closedDeals])
    csvRows.push(['Total Value', formatCurrency(metrics.totalValue)])
    csvRows.push(['Average Deal Size', formatCurrency(metrics.avgDealSize)])
    csvRows.push(['Conversion Rate', `${metrics.conversionRate.toFixed(1)}%`])
    csvRows.push(['Average Time in Stage', `${metrics.avgTimeInStage} days`])
    csvRows.push([])
    
    // Add stage distribution
    csvRows.push(['Stage Distribution'])
    csvRows.push(['Stage', 'Count', 'Total Value'])
    stageDistribution.forEach(stage => {
      csvRows.push([stage.stage, stage.count, formatCurrency(stage.value)])
    })
    csvRows.push([])
    
    // Add sector breakdown
    if (sectorBreakdown.length > 0) {
      csvRows.push(['Sector Breakdown'])
      csvRows.push(['Sector', 'Count', 'Total Value'])
      sectorBreakdown.forEach(sector => {
        csvRows.push([sector.sector, sector.count, formatCurrency(sector.value)])
      })
    }
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')).join('\n')
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const filename = `analytics-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(link.href)
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your pipeline performance and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeDeals} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg {formatCurrency(metrics.avgDealSize)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.closedDeals} closed deals
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time in Stage</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTimeInStage} days</div>
            <p className="text-xs text-muted-foreground">
              Across all stages
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Pipeline Distribution</CardTitle>
              <CardDescription>
                Number of deals and total value by stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="count" fill="#000000" name="Deal Count" />
                  <Bar dataKey="value" fill="#666666" name="Total Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Flow Trends</CardTitle>
              <CardDescription>
                New deals and value over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="deals" stroke="#000000" name="New Deals" />
                  <Line type="monotone" dataKey="value" stroke="#666666" name="Deal Value" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sector Breakdown</CardTitle>
              <CardDescription>
                Distribution of deals across sectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={sectorBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {sectorBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}