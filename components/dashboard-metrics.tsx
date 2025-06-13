'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, CheckCircle } from 'lucide-react'
import { Database } from '@/types/database'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
}

interface DashboardMetricsProps {
  deals: Deal[]
}

export default function DashboardMetrics({ deals }: DashboardMetricsProps) {
  const activeDeals = deals.filter(d => d.stage !== 'closed')
  const closedDeals = deals.filter(d => d.stage === 'closed')
  
  const totalPortfolioValue = closedDeals.reduce((sum, deal) => {
    return sum + (deal.check_size_max || 0)
  }, 0)
  
  const avgDealSize = activeDeals.length > 0 
    ? activeDeals.reduce((sum, d) => sum + (d.check_size_max || 0), 0) / activeDeals.length
    : 0

  const metrics = [
    {
      title: 'Active Deals',
      value: activeDeals.length,
      icon: FileText,
      description: 'In pipeline',
      trend: { value: 12, isPositive: true },
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Portfolio Value',
      value: `$${(totalPortfolioValue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      description: 'Total invested',
      trend: { value: 8, isPositive: true },
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Avg Deal Size',
      value: `$${(avgDealSize / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      description: 'Average check size',
      trend: { value: 5, isPositive: false },
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Closed Deals',
      value: closedDeals.length,
      icon: CheckCircle,
      description: 'This quarter',
      trend: { value: 25, isPositive: true },
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="card-hover animate-in overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`${metric.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{metric.description}</span>
                {metric.trend && (
                  <div className={`flex items-center text-xs ${metric.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.trend.isPositive ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {metric.trend.value}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}