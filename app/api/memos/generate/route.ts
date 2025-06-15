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

    // Call the Supabase edge function with extended timeout
    console.log('Calling generate-memo edge function for deal:', dealId)
    
    // Create an AbortController with a 6-minute timeout (Supabase limit is ~6.67 minutes)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 360000)
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-memo', {
        body: { dealId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      
      clearTimeout(timeoutId)

      if (error) {
        console.error('Error calling edge function:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to generate memo' },
          { status: 500 }
        )
      }

      console.log('Edge function response:', data)
      
      // Ensure we return the memoId from the edge function response
      if (data && data.memoId) {
        return NextResponse.json({ success: true, memoId: data.memoId })
      } else if (data) {
        return NextResponse.json(data)
      } else {
        return NextResponse.json({ error: 'No response from edge function' }, { status: 500 })
      }
    } catch (abortError: any) {
      clearTimeout(timeoutId)
      if (abortError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout. Memo generation is taking longer than expected. Please try again.' },
          { status: 504 }
        )
      }
      throw abortError
    }
  } catch (error: any) {
    console.error('Error generating memo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate memo' },
      { status: 500 }
    )
  }
}