'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/file-upload'
import { Upload, FileText, Loader2 } from 'lucide-react'

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Deal Documents</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload pitch decks and documents for AI analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Acme Inc."
              required
            />
          </div>

          <div>
            <label htmlFor="deal" className="block text-sm font-medium text-gray-700">
              Deal Title
            </label>
            <input
              type="text"
              id="deal"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Series A Investment"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documents
            </label>
            <FileUpload
              onFilesSelected={setFiles}
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              maxSize={50 * 1024 * 1024} // 50MB
              multiple
            />
            
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="-ml-1 mr-2 h-4 w-4" />
                Upload and Analyze
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}