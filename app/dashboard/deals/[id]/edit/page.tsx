'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useActivityLogger } from '@/lib/hooks/use-activity-logger'

const SECTORS = [
  'Consumer Tech',
  'Enterprise Software',
  'FinTech',
  'HealthTech',
  'EdTech',
  'Climate Tech',
  'Web3/Crypto',
  'AI/ML',
  'Cybersecurity',
  'Other'
]

const STAGES = [
  { value: 'thesis_fit', label: 'Thesis Fit' },
  { value: 'signals', label: 'Signals' },
  { value: 'validation', label: 'Validation' },
  { value: 'conviction', label: 'Conviction' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'closed', label: 'Closed' }
]

interface DealData {
  id: string
  stage: string
  check_size_min: number | null
  check_size_max: number | null
  valuation: number | null
  notes: string | null
  company: {
    id: string
    name: string
    website: string | null
    description: string | null
    employee_count: number | null
    metadata: any
  }
}

export default function EditDealPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { logActivity } = useActivityLogger()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deal, setDeal] = useState<DealData | null>(null)
  
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    description: '',
    sector: '',
    stage: 'thesis_fit',
    check_size_min: '',
    check_size_max: '',
    valuation: '',
    revenue: '',
    employee_count: '',
    founder_name: '',
    founder_email: '',
    notes: ''
  })
  
  useEffect(() => {
    fetchDeal()
  }, [params.id])
  
  const fetchDeal = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('id', params.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setDeal(data)
        setFormData({
          company_name: data.company.name,
          website: data.company.website || '',
          description: data.company.description || '',
          sector: data.company.metadata?.sector || '',
          stage: data.stage,
          check_size_min: data.check_size_min?.toString() || '',
          check_size_max: data.check_size_max?.toString() || '',
          valuation: data.valuation?.toString() || '',
          revenue: data.company.metadata?.revenue || '',
          employee_count: data.company.employee_count?.toString() || '',
          founder_name: data.company.metadata?.founder_name || '',
          founder_email: data.company.metadata?.founder_email || '',
          notes: data.notes || ''
        })
      }
    } catch (error) {
      console.error('Error fetching deal:', error)
      toast({
        title: 'Error',
        description: 'Failed to load deal information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deal) return
    
    setSaving(true)
    
    try {
      const supabase = createClient()
      
      // Track what changed for activity log
      const changes: any = {}
      if (deal.company.name !== formData.company_name) changes.company_name = formData.company_name
      if (deal.stage !== formData.stage) changes.stage = formData.stage
      
      // Update company
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          name: formData.company_name,
          website: formData.website || null,
          description: formData.description || null,
          employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
          metadata: {
            sector: formData.sector,
            revenue: formData.revenue || null,
            founder_name: formData.founder_name || null,
            founder_email: formData.founder_email || null
          }
        })
        .eq('id', deal.company.id)
      
      if (companyError) throw companyError
      
      // Update deal
      const { error: dealError } = await supabase
        .from('deals')
        .update({
          stage: formData.stage,
          check_size_min: formData.check_size_min ? parseInt(formData.check_size_min) : null,
          check_size_max: formData.check_size_max ? parseInt(formData.check_size_max) : null,
          valuation: formData.valuation ? parseInt(formData.valuation) : null,
          notes: formData.notes || null
        })
        .eq('id', params.id)
      
      if (dealError) throw dealError
      
      // Log activity if significant changes
      if (Object.keys(changes).length > 0) {
        await logActivity(
          'deal',
          params.id,
          'deal_updated',
          changes
        )
      }
      
      toast({
        title: 'Deal updated',
        description: 'Changes have been saved successfully'
      })
      
      router.push(`/dashboard/deals/${params.id}`)
    } catch (error) {
      console.error('Error updating deal:', error)
      toast({
        title: 'Error',
        description: 'Failed to update deal. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (!deal) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Deal not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/dashboard/deals')}
        >
          Back to Deals
        </Button>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Deal</h1>
          <p className="text-muted-foreground">
            Update deal information for {formData.company_name}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Basic details about the company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of what the company does..."
                rows={3}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sector">Sector *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => handleChange('sector', value)}
                >
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(sector => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_count">Employee Count</Label>
                <Input
                  id="employee_count"
                  type="number"
                  value={formData.employee_count}
                  onChange={(e) => handleChange('employee_count', e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Deal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
            <CardDescription>
              Investment details and pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Pipeline Stage *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => handleChange('stage', value)}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="check_size_min">Min Check Size ($)</Label>
                <Input
                  id="check_size_min"
                  type="number"
                  value={formData.check_size_min}
                  onChange={(e) => handleChange('check_size_min', e.target.value)}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_size_max">Max Check Size ($)</Label>
                <Input
                  id="check_size_max"
                  type="number"
                  value={formData.check_size_max}
                  onChange={(e) => handleChange('check_size_max', e.target.value)}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valuation">Valuation ($)</Label>
                <Input
                  id="valuation"
                  type="number"
                  value={formData.valuation}
                  onChange={(e) => handleChange('valuation', e.target.value)}
                  placeholder="10000000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="revenue">Annual Revenue ($)</Label>
              <Input
                id="revenue"
                type="number"
                value={formData.revenue}
                onChange={(e) => handleChange('revenue', e.target.value)}
                placeholder="1000000"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Founder or primary contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="founder_name">Founder Name</Label>
                <Input
                  id="founder_name"
                  value={formData.founder_name}
                  onChange={(e) => handleChange('founder_name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="founder_email">Founder Email</Label>
                <Input
                  id="founder_email"
                  type="email"
                  value={formData.founder_email}
                  onChange={(e) => handleChange('founder_email', e.target.value)}
                  placeholder="founder@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Additional information or context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this deal..."
              rows={4}
            />
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/deals/${params.id}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !formData.company_name || !formData.sector}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}