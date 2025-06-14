'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Users, UserPlus, Mail, Shield, Clock, Copy, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'partner' | 'analyst'
  is_active: boolean
  created_at: string
  last_sign_in_at?: string
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'partner' | 'analyst'
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
  invited_by: string
  inviter?: {
    full_name: string
  }
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'analyst' as 'admin' | 'partner' | 'analyst'
  })
  const [sending, setSending] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  useEffect(() => {
    checkAdminAccess()
  }, [])
  
  const checkAdminAccess = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/dashboard'
        return
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }
      
      setIsAdmin(true)
      fetchData()
    } catch (error) {
      console.error('Error checking admin access:', error)
      window.location.href = '/dashboard'
    }
  }
  
  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile) return
      
      // Fetch all users in organization
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
      
      // Fetch invitations
      const { data: invitationsData } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:user_profiles!invitations_invited_by_fkey(full_name)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
      
      setUsers(usersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users and invitations',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const sendInvitation = async () => {
    try {
      setSending(true)
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })
      
      if (!response.ok) throw new Error('Failed to send invitation')
      
      const { invitation } = await response.json()
      
      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${inviteForm.email}`
      })
      
      setInviteDialogOpen(false)
      setInviteForm({ email: '', role: 'analyst' })
      fetchData()
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }
  
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })
      
      if (!response.ok) throw new Error('Failed to update user')
      
      toast({
        title: isActive ? 'User deactivated' : 'User activated',
        description: `User has been ${isActive ? 'deactivated' : 'activated'}`
      })
      
      fetchData()
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      })
    }
  }
  
  const copyInviteLink = (token: string) => {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/auth/signup?invitation=${token}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    
    toast({
      title: 'Link copied',
      description: 'Invitation link copied to clipboard'
    })
  }
  
  if (!isAdmin || loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  const activeInvitations = invitations.filter(i => !i.used_at && new Date(i.expires_at) > new Date())
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and invitations for your organization
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: any) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={sendInvitation}
                disabled={!inviteForm.email || sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.is_active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4 text-sm">
              <span>{users.filter(u => u.role === 'admin').length} Admins</span>
              <span>{users.filter(u => u.role === 'partner').length} Partners</span>
              <span>{users.filter(u => u.role === 'analyst').length} Analysts</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for acceptance
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            All users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{user.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        disabled={user.role === 'admin'} // Prevent deactivating admins
                      >
                        {user.is_active ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Pending and used invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="mx-auto h-8 w-8 mb-2" />
              <p>No invitations sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date()
                const isUsed = !!invitation.used_at
                
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invitation.email}</p>
                        <Badge variant="outline">{invitation.role}</Badge>
                        {isUsed && <Badge variant="secondary">Used</Badge>}
                        {!isUsed && isExpired && <Badge variant="destructive">Expired</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invited by {invitation.inviter?.full_name || 'Unknown'} on{' '}
                        {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {!isUsed && !isExpired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invitation.token)}
                      >
                        {copiedToken === invitation.token ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}