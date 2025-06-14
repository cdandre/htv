import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Mark all notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (error) {
      console.error('Error marking notifications as read:', error)
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark all read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}