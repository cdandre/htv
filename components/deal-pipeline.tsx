'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { ChevronRight, Building2, User, DollarSign, Calendar, TrendingUp, Users, Globe, FileText, Brain, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
  analyst: Database['public']['Tables']['user_profiles']['Row'] | null
  partner: Database['public']['Tables']['user_profiles']['Row'] | null
  documents?: { id: string; status: string }[]
  deal_analyses?: { id: string; created_at: string }[]
}

interface DealPipelineProps {
  deals: any[] // Accept any deal shape for flexibility
  onDealDeleted?: () => void // Callback to refresh deals after deletion
}

const stages = [
  { id: 'thesis_fit', name: 'Thesis Fit', color: 'bg-gray-200', borderColor: 'border-gray-300', textColor: 'text-gray-600' },
  { id: 'signals', name: 'Signals', color: 'bg-gray-300', borderColor: 'border-gray-400', textColor: 'text-gray-700' },
  { id: 'validation', name: 'Validation', color: 'bg-gray-400', borderColor: 'border-gray-500', textColor: 'text-gray-800' },
  { id: 'conviction', name: 'Conviction', color: 'bg-gray-500', borderColor: 'border-gray-600', textColor: 'text-gray-900' },
  { id: 'term_sheet', name: 'Term Sheet', color: 'bg-gray-600', borderColor: 'border-gray-700', textColor: 'text-white' },
  { id: 'due_diligence', name: 'Due Diligence', color: 'bg-gray-700', borderColor: 'border-gray-800', textColor: 'text-white' },
  { id: 'closed', name: 'Closed', color: 'bg-black', borderColor: 'border-black', textColor: 'text-white' },
] as const

export default function DealPipeline({ deals, onDealDeleted }: DealPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  const filteredDeals = (selectedStage ? dealsByStage[selectedStage] : deals).filter(deal => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      deal.company.name.toLowerCase().includes(term) ||
      deal.company.location?.toLowerCase().includes(term) ||
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
    if (score >= 8) return 'bg-gray-900 dark:bg-gray-100'
    if (score >= 6) return 'bg-gray-600 dark:bg-gray-400'
    return 'bg-gray-400 dark:bg-gray-600'
  }

  const handleDeleteDeal = async () => {
    if (!deletingDeal) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deletingDeal.id)
      
      if (error) throw error
      
      toast({
        title: 'Deal deleted',
        description: `${deletingDeal.company.name} has been removed from your pipeline.`,
      })
      
      // Call the refresh callback if provided
      if (onDealDeleted) {
        onDealDeleted()
      }
    } catch (error) {
      console.error('Error deleting deal:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete the deal. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeletingDeal(null)
    }
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
              className={`relative p-3 sm:p-4 rounded-sm border-2 transition-all duration-200 ${
                selectedStage === stage.id
                  ? `${stage.color} ${stage.borderColor} ${stage.textColor}`
                  : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative">
                <div className={`text-xl sm:text-2xl font-bold mb-1 ${
                  selectedStage === stage.id ? '' : 'text-black dark:text-white'
                }`}>{stageDeals.length}</div>
                <div className={`text-xs sm:text-sm font-medium ${
                  selectedStage === stage.id ? '' : 'text-gray-600 dark:text-gray-400'
                }`}>{stage.name}</div>
                {totalValue > 0 && (
                  <div className={`text-xs mt-1 sm:mt-2 hidden sm:block ${
                    selectedStage === stage.id ? 'opacity-80' : 'text-gray-500 dark:text-gray-500'
                  }`}>
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
                                {deal.company.location && (
                                  <Badge variant="outline" className="text-xs">
                                    <Globe className="w-3 h-3 mr-1" />
                                    {deal.company.location}
                                  </Badge>
                                )}
                                {stage && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs border ${stage.borderColor} ${stage.textColor} ${
                                      ['term_sheet', 'due_diligence', 'closed'].includes(stage.id) 
                                        ? 'bg-gray-900 dark:bg-gray-100' 
                                        : 'bg-transparent'
                                    }`}
                                  >
                                    {stage.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Document Count */}
                            {deal.documents && deal.documents.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {deal.documents.length}
                              </Badge>
                            )}
                            {/* Analysis Status */}
                            {deal.deal_analyses && deal.deal_analyses.length > 0 && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <Brain className="w-3 h-3 mr-1" />
                                Analyzed
                              </Badge>
                            )}
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeletingDeal(deal)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                          </div>
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
                          
                        </div>
                        
                        {/* Scores */}
                        {(deal.thesis_fit_score || deal.team_score || deal.market_score || deal.product_score) && (
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
                              
                              {deal.product_score && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Product</span>
                                    <span className="text-xs font-medium">{deal.product_score}/10</span>
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${getScoreColor(deal.product_score)}`}
                                      style={{ width: `${deal.product_score * 10}%` }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDeal} onOpenChange={() => setDeletingDeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the deal for {deletingDeal?.company.name}? 
              This action cannot be undone and will remove all associated data including documents and analyses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}