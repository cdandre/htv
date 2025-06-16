import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('research-search', {
      body
    })

    if (error) {
      console.error('Edge function error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to perform search' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Research search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform research search' },
      { status: 500 }
    )
  }
}