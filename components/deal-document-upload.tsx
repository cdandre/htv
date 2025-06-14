'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealDocumentUploadProps {
  dealId: string
  companyId: string
  organizationId: string
  onUploadComplete?: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export default function DealDocumentUpload({ 
  dealId, 
  companyId, 
  organizationId,
  onUploadComplete 
}: DealDocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map())
  const { toast } = useToast()
  const supabase = createClient()
  
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
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }
  
  const handleFiles = async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload documents',
        variant: 'destructive'
      })
      return
    }
    
    // Initialize upload states
    const newUploading = new Map(uploadingFiles)
    files.forEach(file => {
      newUploading.set(file.name, {
        file,
        progress: 0,
        status: 'uploading'
      })
    })
    setUploadingFiles(newUploading)
    
    // Upload files
    for (const file of files) {
      try {
        const fileName = `${dealId}/${Date.now()}-${file.name}`
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)
        
        if (uploadError) throw uploadError
        
        // Update progress
        newUploading.set(file.name, {
          file,
          progress: 50,
          status: 'uploading'
        })
        setUploadingFiles(new Map(newUploading))
        
        // Create document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            deal_id: dealId,
            company_id: companyId,
            organization_id: organizationId,
            title: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
            status: 'pending'
          })
        
        if (dbError) throw dbError
        
        // Mark as completed
        newUploading.set(file.name, {
          file,
          progress: 100,
          status: 'completed'
        })
        setUploadingFiles(new Map(newUploading))
        
      } catch (error) {
        console.error('Upload error:', error)
        newUploading.set(file.name, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        })
        setUploadingFiles(new Map(newUploading))
      }
    }
    
    // Clear completed uploads after 3 seconds
    setTimeout(() => {
      setUploadingFiles(prev => {
        const filtered = new Map()
        prev.forEach((value, key) => {
          if (value.status !== 'completed') {
            filtered.set(key, value)
          }
        })
        return filtered
      })
    }, 3000)
    
    // Trigger analysis if all uploads successful
    const allSuccessful = Array.from(newUploading.values()).every(f => f.status === 'completed')
    if (allSuccessful && files.length > 0) {
      await triggerAnalysis()
    }
    
    if (onUploadComplete) onUploadComplete()
  }
  
  const triggerAnalysis = async () => {
    try {
      const response = await fetch('/api/deals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId })
      })
      
      if (response.ok) {
        toast({
          title: 'Analysis started',
          description: 'AI analysis has been triggered for new documents'
        })
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error)
    }
  }
  
  const removeFile = (fileName: string) => {
    setUploadingFiles(prev => {
      const updated = new Map(prev)
      updated.delete(fileName)
      return updated
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-all",
            isDragging ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700",
            "hover:border-primary hover:bg-primary/5"
          )}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="deal-file-upload"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
          <label
            htmlFor="deal-file-upload"
            className="cursor-pointer"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              Pitch decks, financials, memos, and other relevant documents
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PDF, DOC, XLS, PPT supported • Max 50MB per file
            </p>
          </label>
        </div>
        
        {/* Uploading Files */}
        {uploadingFiles.size > 0 && (
          <div className="mt-4 space-y-2">
            {Array.from(uploadingFiles.entries()).map(([fileName, file]) => (
              <div
                key={fileName}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  file.status === 'error' ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" :
                  file.status === 'completed' ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" :
                  "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                    {file.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileName)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>Documents will be automatically processed and analyzed</p>
          <Button variant="outline" size="sm">
            View All Documents
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}