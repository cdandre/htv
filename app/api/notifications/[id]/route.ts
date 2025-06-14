import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const json = await request.json()
    const { is_read } = json
    
    // Update notification
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read, 
        read_at: is_read ? new Date().toISOString() : null 
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    
    return NextResponse.json({ notification: data })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete notification
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}