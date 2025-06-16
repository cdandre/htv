'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DealPipeline from '@/components/deal-pipeline'
import QuickDealCard from '@/components/quick-deal-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Zap, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Deal {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  company_id: string
  title: string
  stage: string
  analyst_id: string | null
  partner_id: string | null
  check_size_min: number | null
  check_size_max: number | null
  valuation: number | null
  round_size: number | null
  round_type: string | null
  thesis_fit_score: number | null
  market_score: number | null
  team_score: number | null
  product_score: number | null
  notes: string | null
  company: any
  analyst: any
  partner: any
  documents?: any[]
  deal_analyses?: any[]
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  
  useEffect(() => {
    fetchDeals()
  }, [])
  
  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(*),
          analyst:user_profiles!deals_analyst_id_fkey(*),
          partner:user_profiles!deals_partner_id_fkey(*),
          documents(id),
          deal_analyses(id, created_at)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDeals(data || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast({
        title: 'Error loading deals',
        description: 'Please refresh the page to try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleQuickAddSuccess = () => {
    setShowQuickAdd(false)
    fetchDeals() // Refresh the list
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-1 text-black dark:text-white">Deal Pipeline</h1>
            <p className="body-large text-gray-600 dark:text-gray-400 mt-2">
              Manage and track all deals through your investment process
            </p>
          </div>
          <div className="flex items-center gap-3 mt-6 sm:mt-0">
            <Button 
              size="default" 
              className="btn-primary"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
            >
              {showQuickAdd ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Quick Add
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Quick Add Card */}
      {showQuickAdd && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <Card className="p-2 bg-primary/5 border-primary/20">
            <QuickDealCard onSuccess={handleQuickAddSuccess} />
          </Card>
        </div>
      )}
      
      {/* Deal Pipeline Component */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DealPipeline deals={deals} />
      )}
    </div>
  )
}