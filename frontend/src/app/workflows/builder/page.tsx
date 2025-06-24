'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { 
  Trash2,
  Save,
  ArrowLeft,
  Zap,
  Mail,
  Calendar,
  Clock,
  CheckSquare,
  Hand,
  Bell,
  Bot,
  Edit3,
  ArrowDown,
  FileText
} from 'lucide-react'
import { 
  workflowApi,
  getTriggerTypeLabel,
  getActionTypeLabel,
  type WorkflowTrigger,
  type WorkflowAction,
  type Workflow
} from '@/lib/api/workflow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

const TRIGGER_TYPES = [
  { value: 'email_received', label: 'Email Received', icon: Mail },
  { value: 'calendar_event', label: 'Calendar Event', icon: Calendar },
  { value: 'time_based', label: 'Time Based', icon: Clock },
  { value: 'task_created', label: 'Task Created', icon: CheckSquare },
  { value: 'manual', label: 'Manual Trigger', icon: Hand },
]

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Task', icon: CheckSquare },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_event', label: 'Create Event', icon: Calendar },
  { value: 'update_task', label: 'Update Task', icon: Edit3 },
  { value: 'notify', label: 'Send Notification', icon: Bell },
  { value: 'ai_process', label: 'AI Processing', icon: Bot },
]

export default function WorkflowBuilderPage() {
  const { status } = useSession()
  const router = useRouter()
  
  const [workflow, setWorkflow] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    isActive: true,
    triggers: [],
    actions: [],
  })
  
  const [saving, setSaving] = useState(false)

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Add trigger
  const addTrigger = (type: WorkflowTrigger['type']) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger-${Date.now()}`,
      type,
      conditions: [],
    }
    
    setWorkflow(prev => ({
      ...prev,
      triggers: [...(prev.triggers || []), newTrigger],
    }))
  }

  // Remove trigger
  const removeTrigger = (id: string) => {
    setWorkflow(prev => ({
      ...prev,
      triggers: prev.triggers?.filter(t => t.id !== id) || [],
    }))
  }

  // Add action
  const addAction = (type: WorkflowAction['type']) => {
    const newAction: WorkflowAction = {
      id: `action-${Date.now()}`,
      type,
      parameters: {},
      order: workflow.actions?.length || 0,
    }
    
    setWorkflow(prev => ({
      ...prev,
      actions: [...(prev.actions || []), newAction],
    }))
  }

  // Remove action
  const removeAction = (id: string) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions?.filter(a => a.id !== id) || [],
    }))
  }

  // Update action parameters
  const updateActionParameters = (id: string, parameters: WorkflowAction['parameters']) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions?.map(a => 
        a.id === id ? { ...a, parameters } : a
      ) || [],
    }))
  }

  // Save workflow
  const saveWorkflow = async () => {
    if (!workflow.name || !workflow.triggers?.length || !workflow.actions?.length) {
      alert('Please provide a name and at least one trigger and action')
      return
    }

    setSaving(true)
    try {
      await workflowApi.createWorkflow(workflow)
      router.push('/workflows')
    } catch (error) {
      alert('Failed to save workflow. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Create Workflow</h1>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={workflow.isActive}
                onCheckedChange={(isActive) => setWorkflow(prev => ({ ...prev, isActive }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          {/* Basic Info */}
          <Card className="liquid-glass">
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
              <CardDescription>Give your workflow a name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Workflow"
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this workflow does..."
                  value={workflow.description}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Triggers */}
          <Card className="liquid-glass">
            <CardHeader>
              <CardTitle>When to Run</CardTitle>
              <CardDescription>Choose what triggers this workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing triggers */}
              {workflow.triggers?.map((trigger) => (
                <div key={trigger.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{getTriggerTypeLabel(trigger.type)}</p>
                      {trigger.type === 'time_based' && trigger.schedule && (
                        <p className="text-sm text-muted-foreground">
                          {trigger.schedule.frequency} at {trigger.schedule.time}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrigger(trigger.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add trigger */}
              <div>
                <Label>Add Trigger</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {TRIGGER_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      className="h-auto py-4 px-3 flex flex-col items-center gap-2"
                      onClick={() => addTrigger(type.value as WorkflowTrigger['type'])}
                    >
                      <type.icon className="h-5 w-5" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="liquid-glass">
            <CardHeader>
              <CardTitle>What to Do</CardTitle>
              <CardDescription>Define the actions to take when triggered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing actions */}
              <div className="space-y-3">
                {workflow.actions?.map((action, index) => (
                  <div key={action.id}>
                    {index > 0 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{index + 1}</Badge>
                          <p className="font-medium">{getActionTypeLabel(action.type)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAction(action.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Action parameters */}
                      {action.type === 'create_task' && (
                        <div className="space-y-3">
                          <div>
                            <Label>Task Title</Label>
                            <Input
                              placeholder="New task"
                              value={action.parameters.taskTitle || ''}
                              onChange={(e) => updateActionParameters(action.id, {
                                ...action.parameters,
                                taskTitle: e.target.value
                              })}
                            />
                          </div>
                          <div>
                            <Label>Task Description</Label>
                            <Textarea
                              placeholder="Task details..."
                              value={action.parameters.taskDescription || ''}
                              onChange={(e) => updateActionParameters(action.id, {
                                ...action.parameters,
                                taskDescription: e.target.value
                              })}
                            />
                          </div>
                        </div>
                      )}
                      
                      {action.type === 'send_email' && (
                        <div className="space-y-3">
                          <div>
                            <Label>To</Label>
                            <Input
                              placeholder="recipient@example.com"
                              value={action.parameters.emailTo || ''}
                              onChange={(e) => updateActionParameters(action.id, {
                                ...action.parameters,
                                emailTo: e.target.value
                              })}
                            />
                          </div>
                          <div>
                            <Label>Subject</Label>
                            <Input
                              placeholder="Email subject"
                              value={action.parameters.emailSubject || ''}
                              onChange={(e) => updateActionParameters(action.id, {
                                ...action.parameters,
                                emailSubject: e.target.value
                              })}
                            />
                          </div>
                        </div>
                      )}
                      
                      {action.type === 'notify' && (
                        <div>
                          <Label>Notification Message</Label>
                          <Textarea
                            placeholder="Your notification message..."
                            value={action.parameters.notificationMessage || ''}
                            onChange={(e) => updateActionParameters(action.id, {
                              ...action.parameters,
                              notificationMessage: e.target.value
                            })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add action */}
              <div>
                <Label>Add Action</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {ACTION_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      className="h-auto py-4 px-3 flex flex-col items-center gap-2"
                      onClick={() => addAction(type.value as WorkflowAction['type'])}
                    >
                      <type.icon className="h-5 w-5" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Processing Actions */}
          {workflow.actions?.some(a => a.type === 'ai_process') && (
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  AI Processing Templates
                </CardTitle>
                <CardDescription>Choose from common AI processing templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const aiAction = workflow.actions?.find(a => a.type === 'ai_process')
                      if (aiAction) {
                        updateActionParameters(aiAction.id, {
                          ...aiAction.parameters,
                          aiPrompt: 'Summarize the key points from this email and create action items'
                        })
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Summary & Action Items
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const aiAction = workflow.actions?.find(a => a.type === 'ai_process')
                      if (aiAction) {
                        updateActionParameters(aiAction.id, {
                          ...aiAction.parameters,
                          aiPrompt: 'Generate meeting notes and follow-up tasks from this calendar event'
                        })
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Meeting Notes Generator
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      const aiAction = workflow.actions?.find(a => a.type === 'ai_process')
                      if (aiAction) {
                        updateActionParameters(aiAction.id, {
                          ...aiAction.parameters,
                          aiPrompt: 'Analyze this task and suggest subtasks to break it down'
                        })
                      }
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Task Breakdown Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              onClick={saveWorkflow}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}