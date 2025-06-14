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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: entity_type, entity_id' },
        { status: 400 }
      )
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Fetch comments with user info
    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(
          id,
          full_name,
          email
        ),
        replies:comments!parent_id(
          id,
          content,
          created_at,
          user:user_profiles(
            id,
            full_name,
            email
          )
        )
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }
    
    return NextResponse.json({
      comments: data || [],
      total: count || 0
    })
  } catch (error) {
    console.error('Comments fetch error:', error)
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
    const { entity_type, entity_id, content, parent_id, mentions } = json
    
    // Validate required fields
    if (!entity_type || !entity_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, content' },
        { status: 400 }
      )
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Create comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        entity_type,
        entity_id,
        content,
        parent_id,
        mentions: mentions || []
      })
      .select(`
        *,
        user:user_profiles(
          id,
          full_name,
          email
        )
      `)
      .single()
    
    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }
    
    // Log activity
    await fetch(`${request.nextUrl.origin}/api/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        entity_type,
        entity_id,
        action: 'commented',
        details: {
          comment_id: data.id,
          preview: content.substring(0, 100)
        }
      })
    })
    
    return NextResponse.json({ comment: data })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}