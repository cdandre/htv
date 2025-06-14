'use client'

import { useState } from 'react'
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

export default function NewDealPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { logActivity } = useActivityLogger()
  const [loading, setLoading] = useState(false)
  
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile) {
        throw new Error('User profile not found')
      }
      
      // Create company first
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          organization_id: profile.organization_id,
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
        .select()
        .single()
      
      if (companyError) throw companyError
      
      // Create deal
      const dealData = {
        organization_id: profile.organization_id,
        company_id: company.id,
        stage: formData.stage,
        analyst_id: user.id,
        partner_id: user.id, // Default to same user, can be changed later
        check_size_min: formData.check_size_min ? parseInt(formData.check_size_min) : null,
        check_size_max: formData.check_size_max ? parseInt(formData.check_size_max) : null,
        valuation: formData.valuation ? parseInt(formData.valuation) : null,
        notes: formData.notes || null,
        metadata: {}
      }
      
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single()
      
      if (dealError) throw dealError
      
      // Log activity
      await logActivity(
        'deal',
        deal.id,
        'deal_created',
        {
          company_name: formData.company_name,
          stage: formData.stage
        }
      )
      
      toast({
        title: 'Deal created',
        description: `${formData.company_name} has been added to the pipeline`
      })
      
      router.push(`/dashboard/deals/${deal.id}`)
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({
        title: 'Error',
        description: 'Failed to create deal. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Deal</h1>
          <p className="text-muted-foreground">
            Add a new company to your deal pipeline
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
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.company_name || !formData.sector}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Deal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}