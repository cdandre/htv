'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HTVLogo from '@/components/htv-logo'
import { AlertCircle, Mail, Shield, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SecureForm } from '@/components/secure-form'

interface InvitationDetails {
  email: string
  role: 'admin' | 'partner' | 'analyst'
  organization: {
    name: string
  }
  inviter: {
    full_name: string
  }
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingInvite, setCheckingInvite] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null)
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  useEffect(() => {
    checkInvitation()
  }, [])
  
  const checkInvitation = async () => {
    try {
      const token = searchParams.get('invitation')
      
      if (!token) {
        setError('An invitation is required to sign up. Please contact your administrator.')
        setCheckingInvite(false)
        return
      }
      
      setInvitationToken(token)
      
      // Verify invitation token
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select(`
          email,
          role,
          organization:organizations(name),
          inviter:user_profiles!invitations_invited_by_fkey(full_name)
        `)
        .eq('token', token)
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
        .single()
      
      if (inviteError || !invitation) {
        setError('Invalid or expired invitation token. Please contact your administrator.')
        setCheckingInvite(false)
        return
      }
      
      setInvitationDetails(invitation as any)
      setEmail(invitation.email)
      setCheckingInvite(false)
    } catch (error) {
      console.error('Error checking invitation:', error)
      setError('Failed to verify invitation. Please try again.')
      setCheckingInvite(false)
    }
  }
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!invitationToken || !invitationDetails) {
      setError('Valid invitation required')
      setLoading(false)
      return
    }
    
    try {
      // Sign up with invitation token in metadata
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: invitationToken
          }
        }
      })
      
      if (signUpError) throw signUpError
      
      // Sign in immediately after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) throw signInError
      
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }
  
  if (checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verifying invitation...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="max-w-md w-full space-y-8 px-8">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <HTVLogo className="h-12 w-auto" />
          </div>
          <h2 className="heading-2 text-black dark:text-white">
            Create Your Account
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Join HTV VC Operating System
          </p>
        </div>
        
        {error && !invitationDetails && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                <p className="text-sm text-red-600 dark:text-red-500 mt-2">
                  Need an invitation?{' '}
                  <Link href="/auth/login" className="font-medium underline">
                    Return to login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {invitationDetails && (
          <>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Invitation from {invitationDetails.inviter?.full_name || 'HTV'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You've been invited to join {invitationDetails.organization?.name || 'HTV'} as:
                  </p>
                  <Badge variant="default" className="inline-flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {invitationDetails.role.charAt(0).toUpperCase() + invitationDetails.role.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <SecureForm className="mt-8 space-y-6" onSubmit={handleSignup}>
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm">
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-black dark:text-white bg-white dark:bg-black rounded-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-sm cursor-not-allowed"
                    value={email}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    Email is pre-filled from your invitation
                  </p>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-black dark:text-white bg-white dark:bg-black rounded-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    Must be at least 6 characters
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading || !fullName || !password || password.length < 6}
                  className="w-full py-3 px-4 text-sm font-medium text-white bg-black hover:bg-gray-800 dark:text-black dark:bg-white dark:hover:bg-gray-200 rounded-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
                
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-black dark:text-white hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </SecureForm>
          </>
        )}
        
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-500">
            Building the Future of Home
          </p>
        </div>
      </div>
    </div>
  )
}