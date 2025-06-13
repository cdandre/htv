'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/database'
import { BarChart3, TrendingUp, Target } from 'lucide-react'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
}

interface PipelineChartProps {
  deals: Deal[]
}

const stages = [
  { id: 'thesis_fit', name: 'Thesis Fit', gradient: 'linear-gradient(90deg, #94a3b8 0%, #475569 100%)', lightBg: 'rgba(241, 245, 249, 1)' },
  { id: 'signals', name: 'Signals', gradient: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)', lightBg: 'rgba(219, 234, 254, 1)' },
  { id: 'validation', name: 'Validation', gradient: 'linear-gradient(90deg, #facc15 0%, #d97706 100%)', lightBg: 'rgba(254, 243, 199, 1)' },
  { id: 'conviction', name: 'Conviction', gradient: 'linear-gradient(90deg, #4ade80 0%, #10b981 100%)', lightBg: 'rgba(220, 252, 231, 1)' },
  { id: 'term_sheet', name: 'Term Sheet', gradient: 'linear-gradient(90deg, #c084fc 0%, #9333ea 100%)', lightBg: 'rgba(243, 232, 255, 1)' },
  { id: 'due_diligence', name: 'Due Diligence', gradient: 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)', lightBg: 'rgba(224, 231, 255, 1)' },
  { id: 'closed', name: 'Closed', gradient: 'linear-gradient(90deg, #f472b6 0%, #ec4899 100%)', lightBg: 'rgba(252, 231, 243, 1)' },
] as const

export default function PipelineChart({ deals }: PipelineChartProps) {
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage === stage.id).length
    return acc
  }, {} as Record<string, number>)

  const maxDeals = Math.max(...Object.values(dealsByStage), 1)
  const totalActive = deals.filter(d => d.stage !== 'closed').length
  const conversionRate = deals.length > 0 
    ? Math.round((dealsByStage.closed / deals.length) * 100)
    : 0

  return (
    <Card 
      className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
              }}
            >
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Deal Pipeline Overview
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium">{totalActive} Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">{conversionRate}% Rate</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const count = dealsByStage[stage.id]
          const percentage = (count / maxDeals) * 100
          
          return (
            <div 
              key={stage.id} 
              className="space-y-2.5 animate-in"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'slide-up 0.5s ease-out forwards'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ background: stage.gradient }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {stage.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {count} {count === 1 ? 'deal' : 'deals'}
                  </span>
                  {percentage > 0 && (
                    <span className="text-xs font-medium text-gray-400">
                      {Math.round(percentage)}%
                    </span>
                  )}
                </div>
              </div>
              <div 
                className="relative h-10 rounded-xl overflow-hidden"
                style={{ backgroundColor: stage.lightBg }}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out flex items-center justify-end pr-3"
                  style={{ 
                    width: `${Math.max(percentage, count > 0 ? 5 : 0)}%`,
                    background: stage.gradient
                  }}
                >
                  {count > 0 && (
                    <span className="text-sm font-bold text-white drop-shadow-sm">
                      {count}
                    </span>
                  )}
                </div>
                {/* Shimmer effect overlay */}
                {count > 0 && (
                  <div 
                    className="absolute inset-0 -translate-x-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Total Active
              </p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(90deg, #9333ea 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {totalActive}
              </p>
              <p className="text-xs text-gray-400">Across all stages</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Conversion Rate
              </p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(90deg, #16a34a 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {conversionRate}%
              </p>
              <p className="text-xs text-gray-400">To closed deals</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}