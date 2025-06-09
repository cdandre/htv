'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'

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
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <div>
          <Upload className="mx-auto h-12 w-12 text-blue-400" />
          <p className="mt-2 text-sm text-blue-600">Drop the files here...</p>
        </div>
      ) : (
        <div>
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop files here, or click to select
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Supports PDF, Word, PowerPoint, and Excel files up to {maxSize / 1024 / 1024}MB
          </p>
        </div>
      )}
    </div>
  )
}