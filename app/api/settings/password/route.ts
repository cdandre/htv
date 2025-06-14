import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { currentPassword, newPassword } = body
    
    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    })
    
    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}