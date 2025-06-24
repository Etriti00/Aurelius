'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  Plus, 
  Zap, 
  Play, 
  Settings, 
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react'
import useSWR from 'swr'
import { 
  workflowApi,
  getTriggerTypeIcon,
  getActionTypeIcon,
  getWorkflowStatusColor,
  type Workflow,
  type WorkflowExecution
} from '@/lib/api/workflow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function WorkflowsPage() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [pausingWorkflow, setPausingWorkflow] = useState<string | null>(null)
  const [duplicatingWorkflow, setDuplicatingWorkflow] = useState<string | null>(null)
  
  // Fetch workflows
  const { data: workflows, mutate } = useSWR(
    '/workflows',
    () => workflowApi.getWorkflows(),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  // Fetch recent executions
  const { data: executions } = useSWR(
    '/workflows/executions',
    () => workflowApi.getExecutions(),
    {
      revalidateOnFocus: false,
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  )

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Filter workflows
  const filteredWorkflows = workflows?.data?.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'active' && workflow.isActive) ||
      (selectedCategory === 'inactive' && !workflow.isActive)
    
    return matchesSearch && matchesCategory
  }) || []

  // Handle workflow toggle
  const handleToggleWorkflow = async (workflow: Workflow) => {
    try {
      setPausingWorkflow(workflow.id)
      await workflowApi.toggleWorkflow(workflow.id, !workflow.isActive)
      mutate()
    } catch (error) {
      alert('Failed to toggle workflow. Please try again.')
    } finally {
      setPausingWorkflow(null)
    }
  }

  // Handle workflow deletion
  const handleDeleteWorkflow = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        await workflowApi.deleteWorkflow(id)
        mutate()
      } catch (error) {
        alert('Failed to delete workflow. Please try again.')
      }
    }
  }

  // Handle manual trigger
  const handleTriggerWorkflow = async (id: string) => {
    try {
      await workflowApi.triggerWorkflow(id)
      // Refresh executions
    } catch (error) {
      alert('Failed to trigger workflow. Please try again.')
    }
  }

  // Handle workflow duplication
  const handleDuplicateWorkflow = async (workflow: Workflow) => {
    try {
      setDuplicatingWorkflow(workflow.id)
      const duplicatedWorkflow = {
        ...workflow,
        name: `${workflow.name} (Copy)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        lastExecutedAt: undefined,
        executionCount: 0,
      }
      await workflowApi.createWorkflow(duplicatedWorkflow)
      mutate()
    } catch (error) {
      alert('Failed to duplicate workflow. Please try again.')
    } finally {
      setDuplicatingWorkflow(null)
    }
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="liquid-glass-accent rounded-3xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Workflow Automation</h1>
                <p className="text-gray-600 mt-2">
                  Create powerful automations to streamline your work
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => window.location.href = '/workflows/builder'}
                className="bg-black text-white hover:bg-gray-800"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Workflow
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as 'all' | 'active' | 'inactive')}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="liquid-glass p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Trigger Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any trigger</SelectItem>
                      <SelectItem value="email_received">Email Received</SelectItem>
                      <SelectItem value="calendar_event">Calendar Event</SelectItem>
                      <SelectItem value="time_based">Time Based</SelectItem>
                      <SelectItem value="task_created">Task Created</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Last Run</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="never">Never run</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Created By</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      <SelectItem value="me">Me</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {/* Workflows Content */}
          <TabsContent value={selectedCategory} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="liquid-glass hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      {workflow.description && (
                        <CardDescription className="mt-1">
                          {workflow.description}
                        </CardDescription>
                      )}
                      {session?.user?.name && (
                        <Badge variant="outline" className="mt-1 text-xs">by {session.user.name}</Badge>
                      )}
                    </div>
                    <Switch
                      checked={workflow.isActive}
                      onCheckedChange={() => handleToggleWorkflow(workflow)}
                      disabled={pausingWorkflow === workflow.id}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Triggers */}
                  <div>
                    <p className="text-sm font-medium mb-2">Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {workflow.triggers.map((trigger) => (
                        <Badge key={trigger.id} variant="secondary" className="text-xs">
                          <span className="mr-1">{getTriggerTypeIcon(trigger.type)}</span>
                          {trigger.type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <p className="text-sm font-medium mb-2">Actions</p>
                    <div className="flex items-center gap-1">
                      {workflow.actions.slice(0, 3).map((action, index) => (
                        <React.Fragment key={action.id}>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{getActionTypeIcon(action.type)}</span>
                          </div>
                          {index < Math.min(workflow.actions.length - 1, 2) && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                      {workflow.actions.length > 3 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{workflow.actions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workflow.lastExecutedAt 
                        ? formatDistanceToNow(new Date(workflow.lastExecutedAt), { addSuffix: true })
                        : 'Never run'}
                    </span>
                    <span>{workflow.executionCount} runs</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/workflows/${workflow.id}`}
                      className="flex-1"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerWorkflow(workflow.id)}
                      disabled={!workflow.isActive}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleDuplicateWorkflow(workflow)}
                          disabled={duplicatingWorkflow === workflow.id}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {duplicatingWorkflow === workflow.id ? 'Duplicating...' : 'Duplicate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </TabsContent>

          {/* Empty State */}
          {filteredWorkflows.length === 0 && (
            <Card className="liquid-glass-accent p-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to start automating your tasks
              </p>
              <Button onClick={() => window.location.href = '/workflows/builder'}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </Card>
          )}

          {/* Recent Executions */}
          {executions?.data && executions.data.length > 0 && (
            <div className="liquid-glass rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Executions</h2>
              <div className="space-y-2">
                {executions.data.slice(0, 5).map((execution: WorkflowExecution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        getWorkflowStatusColor(execution.status)
                      )}>
                        {execution.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                        {execution.status === 'running' && <Clock className="h-4 w-4" />}
                        {execution.status === 'failed' && <XCircle className="h-4 w-4" />}
                        {execution.status === 'pending' && <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{execution.workflowId}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {execution.actionsCompleted}/{execution.totalActions} actions
                      </p>
                      {execution.error && (
                        <p className="text-xs text-destructive">{execution.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}