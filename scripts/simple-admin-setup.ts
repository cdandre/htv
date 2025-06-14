#!/usr/bin/env node

/**
 * Simplified script to ensure admin user exists
 * Run this after database is set up
 * 
 * Usage: npx tsx scripts/simple-admin-setup.ts
 */

import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

// Load environment variables
try {
  const { config } = require('dotenv')
  config({ path: resolve(process.cwd(), '.env.local') })
} catch (e) {
  // dotenv not installed, rely on environment variables being set
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupAdmin() {
  const email = process.argv[2] || 'admin@htv.com'
  const password = process.argv[3] || 'htv-admin-2025'
  const fullName = process.argv[4] || 'HTV Admin'
  
  console.log('🚀 Setting up admin user...\n')
  
  try {
    // Get or create organization
    let { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    let organizationId: string
    
    if (!orgs || orgs.length === 0) {
      console.log('📢 Creating organization...')
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({ name: 'HTV Ventures' })
        .select()
        .single()
      
      if (error) throw error
      organizationId = newOrg.id
    } else {
      organizationId = orgs[0].id
    }
    
    // Check if user exists
    const { data: users } = await supabase.auth.admin.listUsers()
    let userId: string | null = null
    const existingUser = users?.users?.find(u => u.email === email)
    
    if (existingUser) {
      console.log('✅ User already exists in auth')
      userId = existingUser.id
    } else {
      console.log('📢 Creating new user...')
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          skip_invitation_check: true
        }
      })
      
      if (error) throw error
      userId = newUser.user.id
    }
    
    // Check if profile exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    
    if (!profile) {
      console.log('📢 Creating user profile...')
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          organization_id: organizationId,
          role: 'admin',
          is_active: true
        })
      
      if (error) {
        // If duplicate key error, user was created by trigger
        if (error.code === '23505') {
          console.log('✅ Profile already created by trigger')
        } else {
          throw error
        }
      }
    } else {
      console.log('📢 Updating user to admin...')
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: 'admin',
          is_active: true
        })
        .eq('email', email)
      
      if (error) throw error
    }
    
    console.log('\n🎉 Setup complete!')
    console.log('\n📋 Admin credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('\n⚠️  Important: Change the password after first login!')
    console.log('\n🔗 Login at: http://localhost:3000/auth/login')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupAdmin()