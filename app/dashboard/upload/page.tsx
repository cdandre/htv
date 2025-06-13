'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/file-upload'
import { Upload, FileText, Loader2, Building2, Briefcase, X, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [dealTitle, setDealTitle] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName || !dealTitle || files.length === 0) {
      setError('Please fill in all fields and upload at least one file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Get user organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          organization_id: profile.organization_id,
          name: companyName,
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Create deal
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          organization_id: profile.organization_id,
          company_id: company.id,
          title: dealTitle,
          analyst_id: user.id,
        })
        .select()
        .single()

      if (dealError) throw dealError

      // Upload files
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${deal.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Create document record
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            organization_id: profile.organization_id,
            deal_id: deal.id,
            company_id: company.id,
            title: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })

        if (docError) throw docError
      }

      // Trigger analysis
      const response = await fetch('/api/deals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id }),
      })

      if (!response.ok) throw new Error('Failed to trigger analysis')

      router.push(`/dashboard/deals/${deal.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Deal Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload pitch decks and documents for AI-powered analysis
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="ml-3 font-medium">Company Info</span>
          </div>
          <div className="w-20 h-1 bg-primary mx-4" />
        </div>
        <div className="flex items-center">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              companyName && dealTitle ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              <Upload className="w-5 h-5" />
            </div>
            <span className={`ml-3 font-medium ${
              companyName && dealTitle ? 'text-foreground' : 'text-muted-foreground'
            }`}>Upload Docs</span>
          </div>
          <div className={`w-20 h-1 mx-4 ${
            companyName && dealTitle ? 'bg-primary' : 'bg-gray-200'
          }`} />
        </div>
        <div className="flex items-center">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              files.length > 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className={`ml-3 font-medium ${
              files.length > 0 ? 'text-foreground' : 'text-muted-foreground'
            }`}>Review</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Enter the company details for this deal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10"
                    placeholder="Acme Inc."
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal">
                  Deal Title <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deal"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    className="pl-10"
                    placeholder="Series A Investment"
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload pitch decks, financial models, and other relevant documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={setFiles}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls"
              maxSize={50 * 1024 * 1024} // 50MB
              multiple
            />
            
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Selected Files ({files.length})
                </h4>
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Accepted formats:</strong> PDF, Word, PowerPoint, Excel
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Max file size:</strong> 50MB per file
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {(companyName || dealTitle || files.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Review your submission before uploading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {companyName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="text-sm font-medium">{companyName}</span>
                  </div>
                )}
                {dealTitle && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Deal</span>
                    <span className="text-sm font-medium">{dealTitle}</span>
                  </div>
                )}
                {files.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Documents</span>
                    <span className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={uploading || !companyName || !dealTitle || files.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Analyze
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}