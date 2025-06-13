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
        const gradientMap = {
          'gradient-purple': 'linear-gradient(90deg, #9333ea 0%, #ec4899 100%)',
          'gradient-success': 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
          'gradient-blue': 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
          'gradient-warning': 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)'
        }
        return (
          <div 
            key={index} 
            className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            style={{ 
              animationDelay: `${index * 100}ms`,
              animation: 'slide-up 0.6s ease-out forwards',
              opacity: 0,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
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
              <div 
                className="h-12 w-12 rounded-xl p-2.5 shadow-lg group-hover:scale-110 transition-transform duration-300"
                style={{
                  background: metric.iconBg.replace('from-', '').replace('to-', '').includes('purple') 
                    ? 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
                    : metric.iconBg.includes('green') 
                    ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                    : metric.iconBg.includes('blue')
                    ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metric.description}
              </span>
              {metric.trend && (
                <div 
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: metric.trend.isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: metric.trend.isPositive ? '#16a34a' : '#dc2626'
                  }}
                >
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
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: gradientMap[metric.gradient as keyof typeof gradientMap] || gradientMap['gradient-purple']
              }}
            />
          </div>
        )
      })}
    </div>
  )
}