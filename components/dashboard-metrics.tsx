'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      gradient: 'gradient-purple',
      iconBg: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Portfolio Value',
      value: `$${(totalPortfolioValue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      description: 'Total invested',
      trend: { value: 8, isPositive: true },
      gradient: 'gradient-success',
      iconBg: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Avg Deal Size',
      value: `$${(avgDealSize / 1000000).toFixed(1)}M`,
      icon: Target,
      description: 'Average check size',
      trend: { value: 5, isPositive: false },
      gradient: 'gradient-blue',
      iconBg: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Closed Deals',
      value: closedDeals.length,
      icon: CheckCircle,
      description: 'This quarter',
      trend: { value: 25, isPositive: true },
      gradient: 'gradient-warning',
      iconBg: 'from-yellow-500 to-orange-500',
    },
  ]

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <div 
            key={index} 
            className="metric-card group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            style={{ 
              animationDelay: `${index * 100}ms`,
              animation: 'slide-up 0.6s ease-out forwards'
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <div className={`metric-icon bg-gradient-to-br ${metric.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metric.description}
              </span>
              {metric.trend && (
                <div className={`${metric.trend.isPositive ? 'stat-trend-up' : 'stat-trend-down'}`}>
                  {metric.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="font-semibold">{metric.trend.value}%</span>
                </div>
              )}
            </div>
            
            {/* Decorative gradient line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          </div>
        )
      })}
    </div>
  )
}