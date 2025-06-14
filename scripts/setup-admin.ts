#!/usr/bin/env node

/**
 * Script to create the initial admin user
 * Run this after setting up the database to create your first admin account
 * 
 * Usage: npx tsx scripts/setup-admin.ts
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
  console.error('\nMake sure these are set in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupAdmin() {
  console.log('🚀 Setting up initial admin user...\n')
  
  // Get admin details from command line or use defaults
  const email = process.argv[2] || 'admin@htv.com'
  const password = process.argv[3] || 'htv-admin-2025'
  const fullName = process.argv[4] || 'HTV Admin'
  
  try {
    // Check if organizations exist
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    let organizationId: string
    
    if (!orgs || orgs.length === 0) {
      // Create default organization
      console.log('📢 Creating default organization...')
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: 'HTV Ventures'
        })
        .select()
        .single()
      
      if (createOrgError) {
        console.error('❌ Failed to create organization:', createOrgError)
        process.exit(1)
      }
      
      organizationId = newOrg.id
      console.log('✅ Organization created')
    } else {
      organizationId = orgs[0].id
      console.log('✅ Using existing organization')
    }
    
    // Create admin user
    console.log(`\n📢 Creating admin user: ${email}`)
    
    // First, temporarily create a user profile entry to bypass the trigger
    const tempUserId = crypto.randomUUID()
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        skip_invitation_check: true // Special flag for admin creation
      }
    })
    
    if (authError) {
      if (authError.message?.includes('already exists')) {
        console.log('⚠️  User already exists in auth system')
        
        // Get existing user
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === email)
        
        if (existingUser) {
          // Check if profile exists
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', existingUser.id)
            .maybeSingle()
          
          if (!profile) {
            // Create profile for existing user
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                id: existingUser.id,
                email,
                full_name: fullName,
                organization_id: organizationId,
                role: 'admin',
                is_active: true
              })
            
            if (profileError) {
              console.error('❌ Failed to create user profile:', profileError)
              process.exit(1)
            }
            
            console.log('✅ Created profile for existing user')
          } else {
            // Update existing profile to admin
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                role: 'admin',
                is_active: true,
                organization_id: organizationId
              })
              .eq('id', existingUser.id)
            
            if (updateError) {
              console.error('❌ Failed to update user profile:', updateError)
              process.exit(1)
            }
            
            console.log('✅ Updated existing user to admin')
          }
        }
      } else {
        console.error('❌ Failed to create user:', authError)
        process.exit(1)
      }
    } else if (authUser) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          email,
          full_name: fullName,
          organization_id: organizationId,
          role: 'admin',
          is_active: true
        })
      
      if (profileError) {
        console.error('❌ Failed to create user profile:', profileError)
        // Clean up auth user
        await supabase.auth.admin.deleteUser(authUser.user.id)
        process.exit(1)
      }
      
      console.log('✅ Admin user created successfully')
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

// Run the setup
setupAdmin()