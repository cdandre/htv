import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { dealId } = await request.json()
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the auth token for the edge function
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Call the Supabase edge function
    console.log('Calling generate-memo edge function for deal:', dealId)
    const { data, error } = await supabase.functions.invoke('generate-memo', {
      body: { dealId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (error) {
      console.error('Error calling edge function:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate memo' },
        { status: 500 }
      )
    }

    console.log('Edge function response:', data)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error generating memo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate memo' },
      { status: 500 }
    )
  }
}