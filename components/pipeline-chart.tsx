'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/database'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
}

interface PipelineChartProps {
  deals: Deal[]
}

const stages = [
  { id: 'thesis_fit', name: 'Thesis Fit', color: 'bg-slate-500' },
  { id: 'signals', name: 'Signals', color: 'bg-blue-500' },
  { id: 'validation', name: 'Validation', color: 'bg-yellow-500' },
  { id: 'conviction', name: 'Conviction', color: 'bg-green-500' },
  { id: 'term_sheet', name: 'Term Sheet', color: 'bg-purple-500' },
  { id: 'due_diligence', name: 'Due Diligence', color: 'bg-indigo-500' },
  { id: 'closed', name: 'Closed', color: 'bg-pink-500' },
] as const

export default function PipelineChart({ deals }: PipelineChartProps) {
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage === stage.id).length
    return acc
  }, {} as Record<string, number>)

  const maxDeals = Math.max(...Object.values(dealsByStage), 1)

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Deal Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => {
            const count = dealsByStage[stage.id]
            const percentage = (count / maxDeals) * 100
            
            return (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.name}</span>
                  <span className="text-sm text-muted-foreground">{count} deals</span>
                </div>
                <div className="relative h-8 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${stage.color} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
                    style={{ width: `${percentage}%` }}
                  >
                    {count > 0 && (
                      <span className="text-xs font-medium text-white">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Active</p>
              <p className="text-xl sm:text-2xl font-bold">{deals.filter(d => d.stage !== 'closed' && d.stage !== 'passed').length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conversion Rate</p>
              <p className="text-xl sm:text-2xl font-bold">
                {deals.length > 0 
                  ? `${Math.round((dealsByStage.closed / deals.length) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}