'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Building2, Key, Bell, Shield, Database, Palette, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { NotificationPreferences } from '@/components/notification-preferences'
import { IntegrationsSettings } from '@/components/integrations-settings'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  bio?: string
  organization_id: string
}

interface Organization {
  id: string
  name: string
  website?: string
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  
  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  useEffect(() => {
    loadUserData()
  }, [])
  
  const loadUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
          setFullName(profileData.full_name || '')
          setPhone(profileData.phone || '')
          setBio(profileData.bio || '')
          
          // Load organization if user is admin
          if (profileData.role === 'admin' && profileData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', profileData.organization_id)
              .single()
            
            if (orgData) {
              setOrganization(orgData)
              setOrgName(orgData.name || '')
              setOrgWebsite(orgData.website || '')
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone, bio })
      })
      
      if (response.ok) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully'
        })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleSaveOrganization = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, website: orgWebsite })
      })
      
      if (response.ok) {
        toast({
          title: 'Organization updated',
          description: 'Organization settings have been updated successfully'
        })
      } else {
        throw new Error('Failed to update organization')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update organization',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setSaving(true)
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      
      if (response.ok) {
        toast({
          title: 'Password updated',
          description: 'Your password has been updated successfully'
        })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update password')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input 
                    id="role" 
                    value={profile?.role || ''} 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea 
                  id="bio" 
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization details and team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input 
                    id="orgName" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={profile?.role !== 'admin'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgWebsite">Website</Label>
                  <Input 
                    id="orgWebsite" 
                    type="url" 
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    disabled={profile?.role !== 'admin'}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Team Members</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">John Doe</p>
                        <p className="text-sm text-muted-foreground">john@htv.vc • Partner</p>
                      </div>
                    </div>
                    <Badge>Admin</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Jane Smith</p>
                        <p className="text-sm text-muted-foreground">jane@htv.vc • Analyst</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Member</Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" disabled={profile?.role !== 'admin'}>
                    <User className="mr-2 h-4 w-4" />
                    Invite Team Member
                  </Button>
                  {profile?.role === 'admin' && (
                    <Button onClick={handleSaveOrganization} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdatePassword} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <NotificationPreferences />
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="cursor-pointer hover:border-primary">
                    <CardContent className="p-4">
                      <div className="w-full h-20 bg-white rounded-md border mb-2" />
                      <p className="text-sm font-medium text-center">Light</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:border-primary">
                    <CardContent className="p-4">
                      <div className="w-full h-20 bg-gray-900 rounded-md border mb-2" />
                      <p className="text-sm font-medium text-center">Dark</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:border-primary">
                    <CardContent className="p-4">
                      <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-900 rounded-md border mb-2" />
                      <p className="text-sm font-medium text-center">System</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Accent Color</h3>
                <div className="flex gap-3">
                  <button className="w-10 h-10 bg-blue-500 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-blue-500" />
                  <button className="w-10 h-10 bg-purple-500 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-purple-500" />
                  <button className="w-10 h-10 bg-green-500 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-green-500" />
                  <button className="w-10 h-10 bg-orange-500 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-orange-500" />
                  <button className="w-10 h-10 bg-pink-500 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}