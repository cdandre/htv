import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Update a memo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content, status } = await request.json()
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the memo
    const { data, error } = await supabase
      .from('investment_memos')
      .update({
        content,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating memo:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update memo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating memo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update memo' },
      { status: 500 }
    )
  }
}

// Delete a memo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the memo
    const { error } = await supabase
      .from('investment_memos')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting memo:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete memo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting memo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete memo' },
      { status: 500 }
    )
  }
}