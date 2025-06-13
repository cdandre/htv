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
  { id: 'thesis_fit', name: 'Thesis Fit', color: 'from-slate-400 to-slate-600', lightColor: 'bg-slate-100 dark:bg-slate-900/30' },
  { id: 'signals', name: 'Signals', color: 'from-blue-400 to-blue-600', lightColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'validation', name: 'Validation', color: 'from-yellow-400 to-amber-600', lightColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'conviction', name: 'Conviction', color: 'from-green-400 to-emerald-600', lightColor: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'term_sheet', name: 'Term Sheet', color: 'from-purple-400 to-purple-600', lightColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'due_diligence', name: 'Due Diligence', color: 'from-indigo-400 to-indigo-600', lightColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { id: 'closed', name: 'Closed', color: 'from-pink-400 to-pink-600', lightColor: 'bg-pink-100 dark:bg-pink-900/30' },
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
    <Card className="card-hover bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
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
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${stage.color}`} />
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
              <div className={`relative h-10 ${stage.lightColor} rounded-xl overflow-hidden`}>
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stage.color} transition-all duration-700 ease-out flex items-center justify-end pr-3 shimmer`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                >
                  {count > 0 && (
                    <span className="text-sm font-bold text-white drop-shadow-sm">
                      {count}
                    </span>
                  )}
                </div>
                {/* Shimmer effect overlay */}
                {count > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
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
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {totalActive}
              </p>
              <p className="text-xs text-gray-400">Across all stages</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Conversion Rate
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
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