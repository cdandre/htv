'use client'

import { FormEvent, ReactNode } from 'react'

interface SecureFormProps {
  onSubmit: (e: FormEvent) => void | Promise<void>
  children: ReactNode
  className?: string
}

/**
 * SecureForm component that ensures forms never leak credentials via GET requests
 * This component provides multiple layers of protection against credential exposure
 */
export function SecureForm({ onSubmit, children, className }: SecureFormProps) {
  const handleSubmit = (e: FormEvent) => {
    // Multiple layers of protection
    e.preventDefault()
    e.stopPropagation()
    
    // Get the form element
    const form = e.target as HTMLFormElement
    
    // Double-check we're not using GET method
    if (form.method && form.method.toUpperCase() === 'GET') {
      console.error('Security Error: Form attempted to submit with GET method')
      return
    }
    
    // Call the provided onSubmit handler
    onSubmit(e)
  }
  
  return (
    <form 
      onSubmit={handleSubmit}
      method="post"
      action="#"
      className={className}
      // Prevent any form of GET submission
      onSubmitCapture={(e) => {
        const form = e.currentTarget
        if (form.method.toUpperCase() === 'GET') {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {children}
    </form>
  )
}