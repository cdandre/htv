import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Fetch favorites
    const { data: favorites, error } = await supabase
      .from('research_favorites')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    return NextResponse.json({ favorites })
  } catch (error: any) {
    console.error('Favorites fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, url, snippet, source, published_date, tags, metadata } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Create favorite
    const { data: favorite, error } = await supabase
      .from('research_favorites')
      .insert({
        organization_id: userProfile.organization_id,
        user_id: user.id,
        title,
        url,
        snippet,
        source,
        published_date,
        tags,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'This article is already in your favorites' },
          { status: 409 }
        )
      }
      console.error('Error creating favorite:', error)
      return NextResponse.json({ error: 'Failed to save favorite' }, { status: 500 })
    }

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error: any) {
    console.error('Favorite creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save favorite' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Favorite ID is required' }, { status: 400 })
    }

    // Delete favorite (RLS will ensure user can only delete their own)
    const { error } = await supabase
      .from('research_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting favorite:', error)
      return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Favorite deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete favorite' },
      { status: 500 }
    )
  }
}