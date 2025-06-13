'use client'

import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, CheckCircle, Briefcase, Users, Target, Zap } from 'lucide-react'
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
      icon: Briefcase,
      description: 'In pipeline',
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Portfolio Value',
      value: `$${(totalPortfolioValue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      description: 'Total invested',
      trend: { value: 8, isPositive: true },
    },
    {
      title: 'Avg Deal Size',
      value: `$${(avgDealSize / 1000000).toFixed(1)}M`,
      icon: Target,
      description: 'Average check size',
      trend: { value: 5, isPositive: false },
    },
    {
      title: 'Closed Deals',
      value: closedDeals.length,
      icon: CheckCircle,
      description: 'This quarter',
      trend: { value: 25, isPositive: true },
    },
  ]

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <div 
            key={index} 
            className="card-minimal p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="metric-label mb-2">
                  {metric.title}
                </p>
                <p className="metric-value text-black dark:text-white">
                  {metric.value}
                </p>
              </div>
              <div className="p-2">
                <Icon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="body-small text-gray-600 dark:text-gray-400">
                {metric.description}
              </span>
              {metric.trend && (
                <div className={`inline-flex items-center gap-1 text-sm font-medium ${
                  metric.trend.isPositive ? 'status-success' : 'status-error'
                }`}>
                  {metric.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{metric.trend.value}%</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}