import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Only import Resend if available (optional dependency)
let resend: any = null
try {
  const { Resend } = require('resend')
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (e) {
  // Resend not installed, email sending will be skipped
}

export async function GET(request: NextRequest) {
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
    
    // Fetch invitations for the organization
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        inviter:user_profiles!invitations_invited_by_fkey(full_name)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }
    
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Invitations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id, full_name')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const json = await request.json()
    const { email, role } = json
    
    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('organization_id', profile.organization_id)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in your organization' },
        { status: 400 }
      )
    }
    
    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', profile.organization_id)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      )
    }
    
    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        organization_id: profile.organization_id,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()
    
    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }
    
    // Send invitation email if Resend is configured
    if (resend && process.env.RESEND_FROM_EMAIL) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      const inviteUrl = `${baseUrl}/auth/signup?invitation=${invitation.token}`
      
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: email,
          subject: 'Invitation to join HTV VC Operating System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited to join HTV VC Operating System</h2>
              <p>${profile.full_name || 'An administrator'} has invited you to join as a ${role}.</p>
              <p>Click the link below to create your account:</p>
              <p><a href="${inviteUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
              <p>This invitation will expire in 7 days.</p>
              <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this URL into your browser: ${inviteUrl}</p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
        // Don't fail the request if email fails - admin can still copy the link
      }
    }
    
    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}