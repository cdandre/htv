'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Cloud } from 'lucide-react'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  multiple?: boolean
}

export default function FileUpload({
  onFilesSelected,
  accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
}: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, ext) => {
      const mimeTypes: Record<string, string[]> = {
        '.pdf': ['application/pdf'],
        '.doc': ['application/msword'],
        '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        '.ppt': ['application/vnd.ms-powerpoint'],
        '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        '.xls': ['application/vnd.ms-excel'],
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      }
      if (mimeTypes[ext.trim()]) {
        mimeTypes[ext.trim()].forEach(mime => {
          acc[mime] = []
        })
      }
      return acc
    }, {} as Record<string, string[]>),
    maxSize,
    multiple,
  })

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Cloud className="h-10 w-10 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-primary">Drop your files here</p>
            <p className="text-sm text-muted-foreground mt-1">Release to upload</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Supports PDF, Word, PowerPoint, and Excel files
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: {maxSize / 1024 / 1024}MB
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FileText className="mr-2 h-4 w-4" />
            Select Files
          </button>
        </div>
      )}
    </div>
  )
}