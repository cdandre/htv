'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { ChevronRight, Building2, User, DollarSign } from 'lucide-react'
import Link from 'next/link'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
  analyst: Database['public']['Tables']['user_profiles']['Row'] | null
  partner: Database['public']['Tables']['user_profiles']['Row'] | null
}

interface DealPipelineProps {
  deals: Deal[]
}

const stages = [
  { id: 'thesis_fit', name: 'Thesis Fit', color: 'bg-gray-100' },
  { id: 'signals', name: 'Signals', color: 'bg-blue-100' },
  { id: 'validation', name: 'Validation', color: 'bg-yellow-100' },
  { id: 'conviction', name: 'Conviction', color: 'bg-green-100' },
  { id: 'term_sheet', name: 'Term Sheet', color: 'bg-purple-100' },
  { id: 'due_diligence', name: 'Due Diligence', color: 'bg-indigo-100' },
  { id: 'closed', name: 'Closed', color: 'bg-pink-100' },
] as const

export default function DealPipeline({ deals }: DealPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  return (
    <div>
      {/* Stage Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {stages.map((stage) => {
          const stageDeals = dealsByStage[stage.id]
          const totalValue = stageDeals.reduce((sum, deal) => {
            return sum + (deal.check_size_max || 0)
          }, 0)

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id === selectedStage ? null : stage.id)}
              className={`p-4 rounded-lg border transition-all ${
                selectedStage === stage.id
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              } ${stage.color}`}
            >
              <div className="text-2xl font-bold">{stageDeals.length}</div>
              <div className="text-sm font-medium text-gray-700">{stage.name}</div>
              {totalValue > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  ${(totalValue / 1000000).toFixed(1)}M
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Deal List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedStage
              ? `${stages.find(s => s.id === selectedStage)?.name} Deals`
              : 'All Deals'}
          </h3>
          
          <div className="space-y-4">
            {(selectedStage ? dealsByStage[selectedStage] : deals).map((deal) => (
              <Link
                key={deal.id}
                href={`/dashboard/deals/${deal.id}`}
                className="block hover:bg-gray-50 p-4 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">
                        {deal.company.name}
                      </h4>
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {stages.find(s => s.id === deal.stage)?.name}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-600 space-x-4">
                      {deal.analyst && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {deal.analyst.full_name}
                        </div>
                      )}
                      
                      {deal.check_size_max && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${(deal.check_size_max / 1000000).toFixed(1)}M
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {deal.thesis_fit_score && (
                          <span className="text-xs">
                            Thesis: {deal.thesis_fit_score}/10
                          </span>
                        )}
                        {deal.team_score && (
                          <span className="text-xs">
                            Team: {deal.team_score}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
            
            {(selectedStage ? dealsByStage[selectedStage] : deals).length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No deals in this stage
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}