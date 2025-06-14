'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface NotificationPreferences {
  id?: string
  email_enabled: boolean
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  deals_created: boolean
  deals_updated: boolean
  deals_stage_changed: boolean
  analysis_completed: boolean
  memo_generated: boolean
  documents_uploaded: boolean
  comments_added: boolean
  mentions: boolean
}

export function NotificationPreferences() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    email_frequency: 'immediate',
    deals_created: true,
    deals_updated: true,
    deals_stage_changed: true,
    analysis_completed: true,
    memo_generated: true,
    documents_uploaded: true,
    comments_added: true,
    mentions: true
  })
  
  useEffect(() => {
    loadPreferences()
  }, [])
  
  const loadPreferences = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Try to get existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (data) {
        setPreferences(data)
      } else if (error?.code === 'PGRST116') {
        // No preferences exist yet, create default ones
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single()
        
        if (newPrefs) {
          setPreferences(newPrefs)
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const savePreferences = async () => {
    try {
      setSaving(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated'
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
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
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how and when you want to be notified about updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Settings</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked: boolean) => updatePreference('email_enabled', checked)}
            />
          </div>
          
          {preferences.email_enabled && (
            <div className="space-y-2">
              <Label htmlFor="email-frequency">Email Frequency</Label>
              <Select
                value={preferences.email_frequency}
                onValueChange={(value: any) => updatePreference('email_frequency', value)}
              >
                <SelectTrigger id="email-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Types</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="deals-created">New Deals</Label>
                <p className="text-sm text-muted-foreground">
                  When new deals are added to the pipeline
                </p>
              </div>
              <Switch
                id="deals-created"
                checked={preferences.deals_created}
                onCheckedChange={(checked: boolean) => updatePreference('deals_created', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="deals-updated">Deal Updates</Label>
                <p className="text-sm text-muted-foreground">
                  When deal information is updated
                </p>
              </div>
              <Switch
                id="deals-updated"
                checked={preferences.deals_updated}
                onCheckedChange={(checked: boolean) => updatePreference('deals_updated', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="deals-stage-changed">Stage Changes</Label>
                <p className="text-sm text-muted-foreground">
                  When deals move through the pipeline
                </p>
              </div>
              <Switch
                id="deals-stage-changed"
                checked={preferences.deals_stage_changed}
                onCheckedChange={(checked: boolean) => updatePreference('deals_stage_changed', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analysis-completed">AI Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  When AI analysis is completed
                </p>
              </div>
              <Switch
                id="analysis-completed"
                checked={preferences.analysis_completed}
                onCheckedChange={(checked: boolean) => updatePreference('analysis_completed', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="memo-generated">Investment Memos</Label>
                <p className="text-sm text-muted-foreground">
                  When investment memos are generated
                </p>
              </div>
              <Switch
                id="memo-generated"
                checked={preferences.memo_generated}
                onCheckedChange={(checked: boolean) => updatePreference('memo_generated', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="documents-uploaded">Document Uploads</Label>
                <p className="text-sm text-muted-foreground">
                  When documents are uploaded to deals
                </p>
              </div>
              <Switch
                id="documents-uploaded"
                checked={preferences.documents_uploaded}
                onCheckedChange={(checked: boolean) => updatePreference('documents_uploaded', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="comments-added">Comments</Label>
                <p className="text-sm text-muted-foreground">
                  When comments are added to deals
                </p>
              </div>
              <Switch
                id="comments-added"
                checked={preferences.comments_added}
                onCheckedChange={(checked: boolean) => updatePreference('comments_added', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mentions">Mentions</Label>
                <p className="text-sm text-muted-foreground">
                  When you are mentioned in comments
                </p>
              </div>
              <Switch
                id="mentions"
                checked={preferences.mentions}
                onCheckedChange={(checked: boolean) => updatePreference('mentions', checked)}
              />
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}