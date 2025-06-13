'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { ChevronRight, Building2, User, DollarSign, Calendar, TrendingUp, Users, Globe } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  { id: 'thesis_fit', name: 'Thesis Fit', color: 'bg-slate-500', lightColor: 'bg-slate-100', textColor: 'text-slate-700' },
  { id: 'signals', name: 'Signals', color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700' },
  { id: 'validation', name: 'Validation', color: 'bg-yellow-500', lightColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { id: 'conviction', name: 'Conviction', color: 'bg-green-500', lightColor: 'bg-green-100', textColor: 'text-green-700' },
  { id: 'term_sheet', name: 'Term Sheet', color: 'bg-purple-500', lightColor: 'bg-purple-100', textColor: 'text-purple-700' },
  { id: 'due_diligence', name: 'Due Diligence', color: 'bg-indigo-500', lightColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  { id: 'closed', name: 'Closed', color: 'bg-pink-500', lightColor: 'bg-pink-100', textColor: 'text-pink-700' },
] as const

export default function DealPipeline({ deals }: DealPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  const filteredDeals = (selectedStage ? dealsByStage[selectedStage] : deals).filter(deal => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      deal.company.name.toLowerCase().includes(term) ||
      deal.company.industry?.toLowerCase().includes(term) ||
      deal.analyst?.full_name?.toLowerCase().includes(term)
    )
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-200'
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Stage Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {stages.map((stage, index) => {
          const stageDeals = dealsByStage[stage.id]
          const totalValue = stageDeals.reduce((sum, deal) => {
            return sum + (deal.check_size_max || 0)
          }, 0)

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id === selectedStage ? null : stage.id)}
              className={`relative p-3 sm:p-4 rounded-xl transition-all duration-200 transform hover:scale-105 animate-in ${
                selectedStage === stage.id
                  ? 'ring-2 ring-primary shadow-lg scale-105'
                  : 'hover:shadow-md'
              }`}
              style={{ 
                animationDelay: `${index * 50}ms`,
                background: selectedStage === stage.id 
                  ? `linear-gradient(135deg, ${stage.lightColor} 0%, white 100%)`
                  : 'white'
              }}
            >
              <div className={`absolute inset-0 rounded-xl opacity-10 ${stage.color}`} />
              <div className="relative">
                <div className="text-xl sm:text-2xl font-bold mb-1">{stageDeals.length}</div>
                <div className={`text-xs sm:text-sm font-medium ${stage.textColor}`}>{stage.name}</div>
                {totalValue > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 sm:mt-2 hidden sm:block">
                    ${(totalValue / 1000000).toFixed(1)}M
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search deals by company, industry, or analyst..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-10 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <svg
          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Deal List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {selectedStage
                ? `${stages.find(s => s.id === selectedStage)?.name} Deals`
                : 'All Deals'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'})
              </span>
            </h3>
          </div>
          
          <div className="space-y-3">
            {filteredDeals.map((deal, index) => {
              const stage = stages.find(s => s.id === deal.stage)
              const avgScore = (deal.thesis_fit_score && deal.team_score) 
                ? (deal.thesis_fit_score + deal.team_score) / 2 
                : null
              
              return (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="block group"
                >
                  <Card className="p-5 hover:shadow-md transition-all duration-200 border-gray-100 hover:border-primary/20 card-hover">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Company Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {deal.company.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.company.industry && (
                                  <Badge variant="outline" className="text-xs">
                                    <Globe className="w-3 h-3 mr-1" />
                                    {deal.company.industry}
                                  </Badge>
                                )}
                                {stage && (
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${stage.lightColor} ${stage.textColor} border-0`}
                                  >
                                    {stage.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        
                        {/* Deal Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                          {deal.analyst && (
                            <div className="flex items-center text-muted-foreground">
                              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="truncate">{deal.analyst.full_name}</span>
                            </div>
                          )}
                          
                          {deal.check_size_max && (
                            <div className="flex items-center text-muted-foreground">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span>${(deal.check_size_max / 1000000).toFixed(1)}M</span>
                            </div>
                          )}
                          
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline">{formatDate(deal.created_at)}</span>
                            <span className="sm:hidden">{new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          
                          {deal.company.funding_stage && (
                            <div className="flex items-center text-muted-foreground">
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="truncate">{deal.company.funding_stage}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Scores */}
                        {(deal.thesis_fit_score || deal.team_score || deal.market_score || deal.traction_score) && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                              {deal.thesis_fit_score && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Thesis</span>
                                    <span className="text-xs font-medium">{deal.thesis_fit_score}/10</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${getScoreColor(deal.thesis_fit_score)}`}
                                      style={{ width: `${deal.thesis_fit_score * 10}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {deal.team_score && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Team</span>
                                    <span className="text-xs font-medium">{deal.team_score}/10</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${getScoreColor(deal.team_score)}`}
                                      style={{ width: `${deal.team_score * 10}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {deal.market_score && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Market</span>
                                    <span className="text-xs font-medium">{deal.market_score}/10</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${getScoreColor(deal.market_score)}`}
                                      style={{ width: `${deal.market_score * 10}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {deal.traction_score && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Traction</span>
                                    <span className="text-xs font-medium">{deal.traction_score}/10</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${getScoreColor(deal.traction_score)}`}
                                      style={{ width: `${deal.traction_score * 10}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
            
            {filteredDeals.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm 
                    ? `No deals found matching "${searchTerm}"`
                    : selectedStage
                      ? 'No deals in this stage'
                      : 'No deals yet'
                  }
                </p>
                {(searchTerm || selectedStage) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedStage(null)
                    }}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}