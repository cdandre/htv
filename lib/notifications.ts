interface NotificationData {
  type: string
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  user_ids?: string[]
  metadata?: Record<string, any>
}

export async function createNotification(data: NotificationData) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      console.error('Failed to create notification')
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

// Helper functions for common notification types
export const notificationHelpers = {
  dealCreated: (dealId: string, dealName: string, creatorName: string) => ({
    type: 'deal_created',
    title: 'New Deal Created',
    message: `${creatorName} created a new deal: ${dealName}`,
    entity_type: 'deal',
    entity_id: dealId,
    action_url: `/dashboard/deals/${dealId}`
  }),
  
  dealStageChanged: (dealId: string, dealName: string, newStage: string, updaterName: string) => ({
    type: 'deal_stage_changed',
    title: 'Deal Stage Updated',
    message: `${updaterName} moved ${dealName} to ${newStage}`,
    entity_type: 'deal',
    entity_id: dealId,
    action_url: `/dashboard/deals/${dealId}`
  }),
  
  analysisCompleted: (dealId: string, dealName: string) => ({
    type: 'analysis_completed',
    title: 'AI Analysis Complete',
    message: `AI analysis completed for ${dealName}`,
    entity_type: 'deal',
    entity_id: dealId,
    action_url: `/dashboard/deals/${dealId}?tab=analysis`
  }),
  
  memoGenerated: (dealId: string, memoId: string, dealName: string) => ({
    type: 'memo_generated',
    title: 'Investment Memo Generated',
    message: `New investment memo generated for ${dealName}`,
    entity_type: 'memo',
    entity_id: memoId,
    action_url: `/dashboard/memos/${memoId}`
  }),
  
  documentUploaded: (dealId: string, dealName: string, fileName: string, uploaderName: string) => ({
    type: 'document_uploaded',
    title: 'Document Uploaded',
    message: `${uploaderName} uploaded ${fileName} to ${dealName}`,
    entity_type: 'deal',
    entity_id: dealId,
    action_url: `/dashboard/deals/${dealId}?tab=documents`
  }),
  
  commentAdded: (entityType: string, entityId: string, entityName: string, commenterName: string) => ({
    type: 'comment_added',
    title: 'New Comment',
    message: `${commenterName} commented on ${entityName}`,
    entity_type: entityType,
    entity_id: entityId,
    action_url: `/dashboard/${entityType}s/${entityId}?tab=comments`
  })
}