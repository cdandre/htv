import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    console.log('Processing document:', documentId)
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
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { documentId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (error) {
      console.error('Error calling edge function:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to process document' },
        { status: 500 }
      )
    }

    // Check if the edge function returned an error in the response
    if (data && data.error) {
      console.error('Edge function error:', data.error)
      return NextResponse.json(
        { error: data.error },
        { status: 500 }
      )
    }

    return NextResponse.json(data || { success: true })
  } catch (error: any) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    )
  }
}