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
  { id: 'thesis_fit', name: 'Thesis Fit', color: '#000000' },
  { id: 'signals', name: 'Signals', color: '#333333' },
  { id: 'validation', name: 'Validation', color: '#666666' },
  { id: 'conviction', name: 'Conviction', color: '#999999' },
  { id: 'term_sheet', name: 'Term Sheet', color: '#BBBBBB' },
  { id: 'due_diligence', name: 'Due Diligence', color: '#DDDDDD' },
  { id: 'closed', name: 'Closed', color: '#000000' },
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
    <Card className="card-minimal">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-3 text-black dark:text-white flex items-center gap-3">
            <BarChart3 className="h-5 w-5" />
            Deal Pipeline
          </CardTitle>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-black dark:text-white">{totalActive}</span>
              <span className="text-gray-600 dark:text-gray-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-black dark:text-white">{conversionRate}%</span>
              <span className="text-gray-600 dark:text-gray-400">Conversion</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const count = dealsByStage[stage.id]
          const percentage = (count / maxDeals) * 100
          
          return (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stage.name}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {count} {count === 1 ? 'deal' : 'deals'}
                </span>
              </div>
              <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.max(percentage, count > 0 ? 5 : 0)}%`,
                    backgroundColor: stage.id === 'closed' ? '#000000' : stage.color,
                    opacity: stage.id === 'closed' ? 1 : 0.7
                  }}
                />
              </div>
            </div>
          )
        })}
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="metric-label">Total Active</p>
              <p className="text-3xl font-bold text-black dark:text-white mt-1">
                {totalActive}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Across all stages</p>
            </div>
            <div>
              <p className="metric-label">Conversion Rate</p>
              <p className="text-3xl font-bold text-black dark:text-white mt-1">
                {conversionRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">To closed deals</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}