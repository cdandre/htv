'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Plus, FileText, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickDealCardProps {
  onSuccess?: () => void
}

export default function QuickDealCard({ onSuccess }: QuickDealCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [companyName, setCompanyName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleQuickCreate = async () => {
    if (!companyName.trim()) {
      toast({
        title: 'Company name required',
        description: 'Please enter a company name to continue',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setLoading(true)
      
      // Get user details
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile) throw new Error('Profile not found')
      
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName.trim(),
          organization_id: profile.organization_id
        })
        .select()
        .single()
      
      if (companyError) throw companyError
      
      // Create deal with minimal info
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          company_id: company.id,
          organization_id: profile.organization_id,
          title: `${companyName.trim()} Investment Opportunity`,
          stage: 'thesis_fit'
        })
        .select()
        .single()
      
      if (dealError) throw dealError
      
      // Upload files if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileName = `${deal.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          return supabase
            .from('documents')
            .insert({
              deal_id: deal.id,
              company_id: company.id,
              organization_id: profile.organization_id,
              title: file.name,
              file_path: fileName,
              mime_type: file.type,
              file_size: file.size,
              uploaded_by: user.id,
              status: 'pending'
            })
        })
        
        await Promise.all(uploadPromises)
        
        // Trigger AI analysis
        const analyzeResponse = await fetch('/api/deals/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId: deal.id })
        })
        
        let analysisSuccess = true
        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json()
          console.error('Analysis failed:', errorData)
          analysisSuccess = false
        }
        
        toast({
          title: 'Deal created successfully',
          description: analysisSuccess
            ? 'Documents uploaded and analysis started'
            : 'Documents uploaded but analysis failed. You can retry analysis later.'
        })
      } else {
        toast({
          title: 'Deal created successfully',
          description: 'You can add documents anytime'
        })
      }
      
      if (onSuccess) onSuccess()
      router.push(`/dashboard/deals/${deal.id}`)
      
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({
        title: 'Error creating deal',
        description: 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card className="overflow-hidden">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "transition-all duration-200",
          isDragging && "bg-primary/5 border-primary"
        )}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Company Name Input */}
            <div>
              <Input
                placeholder="Company name (required)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="text-lg font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && companyName.trim()) {
                    handleQuickCreate()
                  }
                }}
              />
            </div>
            
            {/* File Upload Area */}
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="quick-file-upload"
                disabled={loading}
              />
              <label
                htmlFor="quick-file-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  isDragging && "border-primary bg-primary/5",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pitch decks, financials, memos (optional)
                </p>
              </label>
            </div>
            
            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">
                        {file.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Action Button */}
            <Button
              onClick={handleQuickCreate}
              disabled={!companyName.trim() || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating deal...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Deal
                </>
              )}
            </Button>
            
            {/* Alternative Action */}
            <p className="text-xs text-center text-muted-foreground">
              Need more options?{' '}
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto font-normal"
                onClick={() => router.push('/dashboard/deals/new')}
                disabled={loading}
              >
                Use full form
              </Button>
            </p>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}