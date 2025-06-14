import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread') === 'true'
    
    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    return NextResponse.json({ 
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0
    })
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const json = await request.json()
    const { type, title, message, entity_type, entity_id, action_url, user_ids } = json
    
    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Create notifications
    const notificationData = (user_ids || [user.id]).map((userId: string) => ({
      organization_id: profile.organization_id,
      user_id: userId,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      metadata: json.metadata || {}
    }))
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
    
    if (error) {
      console.error('Error creating notifications:', error)
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 })
    }
    
    // TODO: Send email notifications based on user preferences
    
    return NextResponse.json({ notifications: data })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}