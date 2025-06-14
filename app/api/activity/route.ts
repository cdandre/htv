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
    
    const json = await request.json()
    const { entity_type, entity_id, action, details } = json
    
    // Validate required fields
    if (!entity_type || !entity_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, action' },
        { status: 400 }
      )
    }
    
    // Get user profile for organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Log the activity
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        entity_type,
        entity_id,
        action,
        details: details || {}
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error logging activity:', error)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }
    
    return NextResponse.json({ activity: data })
  } catch (error) {
    console.error('Activity logging error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Get user profile for organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Build query
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:user_profiles(
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply filters
    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }
    if (entity_id) {
      query = query.eq('entity_id', entity_id)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      activities: data || [],
      total: count || 0
    })
  } catch (error) {
    console.error('Activity fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}