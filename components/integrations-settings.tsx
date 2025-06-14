'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Database, MessageSquare, FileText, Calendar, Mail, 
  Cloud, Lock, Check, X, Settings, ExternalLink, 
  Loader2, AlertCircle 
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  category: string
  status: 'connected' | 'disconnected'
  features: string[]
  configFields?: {
    name: string
    label: string
    type: 'text' | 'password' | 'url'
    placeholder?: string
    required?: boolean
  }[]
}

const integrations: Integration[] = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync deals and contacts with Salesforce CRM',
    icon: Database,
    category: 'CRM',
    status: 'disconnected',
    features: ['Two-way sync', 'Contact import', 'Deal pipeline sync'],
    configFields: [
      { name: 'domain', label: 'Salesforce Domain', type: 'url', placeholder: 'https://your-domain.salesforce.com', required: true },
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and updates to Slack channels',
    icon: MessageSquare,
    category: 'Communication',
    status: 'disconnected',
    features: ['Deal notifications', 'Activity alerts', 'Team mentions'],
    configFields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/...', required: true },
      { name: 'channel', label: 'Default Channel', type: 'text', placeholder: '#deals', required: true }
    ]
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Import emails and attachments from Gmail',
    icon: Mail,
    category: 'Email',
    status: 'disconnected',
    features: ['Email import', 'Attachment sync', 'Contact extraction']
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Store and sync documents with Google Drive',
    icon: Cloud,
    category: 'Storage',
    status: 'disconnected',
    features: ['Document backup', 'File sharing', 'Collaborative editing']
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Schedule meetings and sync calendar events',
    icon: Calendar,
    category: 'Calendar',
    status: 'disconnected',
    features: ['Meeting scheduling', 'Calendar sync', 'Availability tracking'],
    configFields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'userId', label: 'User ID', type: 'text', required: true }
    ]
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    description: 'Send and track documents for signatures',
    icon: FileText,
    category: 'Documents',
    status: 'disconnected',
    features: ['E-signatures', 'Document tracking', 'Automated workflows'],
    configFields: [
      { name: 'accountId', label: 'Account ID', type: 'text', required: true },
      { name: 'apiKey', label: 'API Key', type: 'password', required: true }
    ]
  }
]

export function IntegrationsSettings() {
  const { toast } = useToast()
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [configuring, setConfiguring] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, 'connected' | 'disconnected'>>(
    Object.fromEntries(integrations.map(i => [i.id, i.status]))
  )
  
  const handleConnect = (integration: Integration) => {
    if (integration.configFields) {
      setSelectedIntegration(integration)
      setConfigValues({})
    } else {
      // OAuth flow simulation
      toast({
        title: 'Redirecting to OAuth',
        description: `Please authorize HTV to access your ${integration.name} account`
      })
      
      // Simulate OAuth success
      setTimeout(() => {
        setIntegrationStatuses(prev => ({ ...prev, [integration.id]: 'connected' }))
        toast({
          title: 'Integration connected',
          description: `${integration.name} has been successfully connected`
        })
      }, 2000)
    }
  }
  
  const handleDisconnect = (integrationId: string) => {
    setIntegrationStatuses(prev => ({ ...prev, [integrationId]: 'disconnected' }))
    toast({
      title: 'Integration disconnected',
      description: 'The integration has been removed'
    })
  }
  
  const handleSaveConfig = async () => {
    if (!selectedIntegration) return
    
    // Validate required fields
    const missingFields = selectedIntegration.configFields?.filter(
      field => field.required && !configValues[field.name]
    )
    
    if (missingFields?.length) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setConfiguring(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIntegrationStatuses(prev => ({ 
        ...prev, 
        [selectedIntegration.id]: 'connected' 
      }))
      
      toast({
        title: 'Integration configured',
        description: `${selectedIntegration.name} has been successfully connected`
      })
      
      setSelectedIntegration(null)
      setConfigValues({})
    } catch (error) {
      toast({
        title: 'Configuration failed',
        description: 'Failed to connect integration. Please check your credentials.',
        variant: 'destructive'
      })
    } finally {
      setConfiguring(false)
    }
  }
  
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect HTV with your favorite tools and services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-medium">{category}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryIntegrations.map((integration) => {
                  const Icon = integration.icon
                  const isConnected = integrationStatuses[integration.id] === 'connected'
                  
                  return (
                    <Card key={integration.id} className={isConnected ? 'border-primary/20' : ''}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isConnected ? 'bg-primary/10' : 'bg-muted'
                              }`}>
                                <Icon className={`w-5 h-5 ${isConnected ? 'text-primary' : ''}`} />
                              </div>
                              <div>
                                <p className="font-medium">{integration.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {integration.description}
                                </p>
                              </div>
                            </div>
                            {isConnected && (
                              <Badge variant="success" className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {integration.features.map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                            
                            {isConnected ? (
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDisconnect(integration.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleConnect(integration)}
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
          
          <div className="pt-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Need a different integration?</p>
                    <p className="text-sm text-muted-foreground">
                      Contact support to request additional integrations or use our API to build custom connections.
                    </p>
                    <Button variant="link" className="h-auto p-0 text-sm">
                      View API Documentation
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Configuration Dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Enter your {selectedIntegration?.name} credentials to connect the integration
            </DialogDescription>
          </DialogHeader>
          
          {selectedIntegration?.configFields && (
            <div className="space-y-4 py-4">
              {selectedIntegration.configFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={configValues[field.name] || ''}
                    onChange={(e) => setConfigValues(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                  />
                </div>
              ))}
              
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-start space-x-2">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your credentials are encrypted and stored securely. We never share your data with third parties.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={configuring}>
              {configuring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}