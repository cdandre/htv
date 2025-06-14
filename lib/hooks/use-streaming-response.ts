import { useState, useCallback } from 'react'

interface StreamingOptions {
  onProgress?: (section: string, progress: number) => void
  onComplete?: (data: any) => void
  onError?: (error: string) => void
}

export function useStreamingResponse() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState('')
  
  const startStreaming = useCallback(async (
    url: string,
    body: any,
    options: StreamingOptions = {}
  ) => {
    setIsStreaming(true)
    setProgress(0)
    setCurrentSection('')
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        throw new Error('Stream request failed')
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Stream not available')
      }
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                options.onError?.(data.error)
                setIsStreaming(false)
                return
              }
              
              if (data.type === 'progress') {
                setProgress(data.progress)
                setCurrentSection(data.section)
                options.onProgress?.(data.section, data.progress)
              } else if (data.type === 'complete') {
                options.onComplete?.(data.content)
                setIsStreaming(false)
                setProgress(100)
              }
            } catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      options.onError?.(error instanceof Error ? error.message : 'Unknown error')
      setIsStreaming(false)
    }
  }, [])
  
  return {
    startStreaming,
    isStreaming,
    progress,
    currentSection,
  }
}