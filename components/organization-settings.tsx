'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Users, Building2, Loader2, Shield, Mail, Calendar } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import Link from 'next/link'

interface OrganizationSettingsProps {
  userProfile: {
    role: string
    organization_id: string
  }
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'partner' | 'analyst'
  is_active: boolean
  created_at: string
}

export function OrganizationSettings({ userProfile }: OrganizationSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [orgName, setOrgName] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  
  const isAdmin = userProfile.role === 'admin'
  
  useEffect(() => {
    loadOrganizationData()
  }, [])
  
  const loadOrganizationData = async () => {
    try {
      const supabase = createClient()
      
      // Load organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userProfile.organization_id)
        .single()
      
      if (orgData) {
        setOrganization(orgData)
        setOrgName(orgData.name || '')
        setOrgWebsite(orgData.website || '')
      }
      
      // Load team members
      const { data: members } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
      
      if (members) {
        setTeamMembers(members)
      }
    } catch (error) {
      console.error('Error loading organization data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSaveOrganization = async () => {
    if (!isAdmin) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          website: orgWebsite
        })
      })
      
      if (!response.ok) throw new Error('Failed to update organization')
      
      toast({
        title: 'Organization updated',
        description: 'Your organization settings have been saved'
      })
    } catch (error) {
      console.error('Error updating organization:', error)
      toast({
        title: 'Error',
        description: 'Failed to update organization settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-black text-white">Admin</Badge>
      case 'partner':
        return <Badge variant="secondary">Partner</Badge>
      case 'analyst':
        return <Badge variant="outline">Analyst</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }
  
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
    ) : (
      <Badge variant="outline" className="text-gray-500 border-gray-500">Inactive</Badge>
    )
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Manage your organization details and view team members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input 
              id="orgName" 
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isAdmin}
              placeholder="HTV Ventures"
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                Only admins can edit organization details
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgWebsite">Website</Label>
            <Input 
              id="orgWebsite" 
              type="url" 
              value={orgWebsite}
              onChange={(e) => setOrgWebsite(e.target.value)}
              disabled={!isAdmin}
              placeholder="https://example.com"
            />
          </div>
          
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleSaveOrganization} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Organization Details'
                )}
              </Button>
            </div>
          )}
        </div>
        
        {/* Team Members */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Team Members</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
            </div>
          </div>
          
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(member.is_active)}
                  {getRoleBadge(member.role)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/admin/users">
                  <Shield className="mr-2 h-4 w-4" />
                  Manage Users
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/admin/users">
                  <User className="mr-2 h-4 w-4" />
                  Invite Team Member
                </Link>
              </Button>
            </div>
          )}
        </div>
        
        {/* Organization Stats */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Organization Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Users</p>
              <p className="font-medium">{teamMembers.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Active Users</p>
              <p className="font-medium">{teamMembers.filter(m => m.is_active).length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Admins</p>
              <p className="font-medium">{teamMembers.filter(m => m.role === 'admin').length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {organization?.created_at ? format(new Date(organization.created_at), 'MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}