import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const json = await request.json()
    const { is_active, role } = json
    
    // Get target user to ensure they're in the same organization
    const { data: targetUser } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', params.id)
      .single()
    
    if (!targetUser || targetUser.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Prevent deactivating/demoting other admins
    if (targetUser.role === 'admin' && (is_active === false || (role && role !== 'admin'))) {
      return NextResponse.json(
        { error: 'Cannot deactivate or change role of admin users' },
        { status: 400 }
      )
    }
    
    // Build update object
    const updates: any = {}
    if (is_active !== undefined) updates.is_active = is_active
    if (role !== undefined) updates.role = role
    
    // Update user
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action: is_active !== undefined ? 
          (is_active ? 'user_activated' : 'user_deactivated') : 
          'user_role_changed',
        entity_type: 'user',
        entity_id: params.id,
        metadata: {
          changes: updates,
          target_user_email: data.email
        }
      })
    
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}