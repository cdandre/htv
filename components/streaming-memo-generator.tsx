'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle } from 'lucide-react'
import { useStreamingResponse } from '@/lib/hooks/use-streaming-response'
import { useToast } from '@/components/ui/use-toast'

interface StreamingMemoGeneratorProps {
  dealId: string
  analysisId: string
  onComplete?: (memoContent: any) => void
}

export function StreamingMemoGenerator({ 
  dealId, 
  analysisId, 
  onComplete 
}: StreamingMemoGeneratorProps) {
  const { toast } = useToast()
  const { startStreaming, isStreaming, progress, currentSection } = useStreamingResponse()
  const [completedSections, setCompletedSections] = useState<string[]>([])
  
  const sections = [
    'Executive Summary',
    'Investment Thesis',
    'Company Overview',
    'Market Opportunity',
    'Team Assessment',
    'Product & Technology',
    'Traction & Metrics',
    'Competitive Analysis',
    'Financial Analysis',
    'Risks & Mitigation',
    'Recommendation',
    'Proposed Terms'
  ]
  
  const handleGenerate = async () => {
    setCompletedSections([])
    
    await startStreaming(
      '/api/memos/stream',
      { dealId, analysisId },
      {
        onProgress: (section, progress) => {
          if (progress > 0 && !completedSections.includes(section)) {
            setCompletedSections(prev => [...prev, section])
          }
        },
        onComplete: (content) => {
          toast({
            title: 'Memo generated',
            description: 'Your investment memo has been created successfully'
          })
          onComplete?.(content)
        },
        onError: (error) => {
          toast({
            title: 'Generation failed',
            description: error,
            variant: 'destructive'
          })
        }
      }
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Investment Memo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isStreaming && progress === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Generate a comprehensive investment memo with AI
            </p>
            <Button onClick={handleGenerate}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Memo
            </Button>
          </div>
        )}
        
        {(isStreaming || progress > 0) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentSection || 'Preparing...'}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">Generation Progress</p>
              {sections.map((section) => {
                const isCompleted = completedSections.includes(section)
                const isCurrent = currentSection === section
                
                return (
                  <div 
                    key={section} 
                    className={`flex items-center gap-2 text-sm ${
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span className={isCurrent ? 'font-medium' : ''}>
                      {section}
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Processing
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
            
            {progress === 100 && (
              <div className="pt-4">
                <Button className="w-full">
                  View Generated Memo
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}