import { useToast } from '@/components/ui/use-toast'

interface ActivityDetails {
  [key: string]: any
}

export function useActivityLogger() {
  const { toast } = useToast()
  
  const logActivity = async (
    entity_type: string,
    entity_id: string,
    action: string,
    details?: ActivityDetails
  ) => {
    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_type,
          entity_id,
          action,
          details
        })
      })
      
      if (!response.ok) {
        console.error('Failed to log activity')
      }
    } catch (error) {
      console.error('Activity logging error:', error)
    }
  }
  
  return { logActivity }
}