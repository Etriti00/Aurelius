import { apiClient } from './client'
import { ApiResponse } from './types'

export interface WorkflowTrigger {
  id: string
  type: 'email_received' | 'calendar_event' | 'time_based' | 'task_created' | 'manual'
  conditions: {
    field: string
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
    value: string | number | boolean
  }[]
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time?: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
}

export interface WorkflowAction {
  id: string
  type: 'create_task' | 'send_email' | 'create_event' | 'update_task' | 'notify' | 'ai_process'
  parameters: {
    taskTitle?: string
    taskDescription?: string
    taskDueDate?: string
    emailTo?: string
    emailSubject?: string
    emailBody?: string
    eventTitle?: string
    eventDate?: string
    eventDuration?: number
    notificationMessage?: string
    aiPrompt?: string
  }
  order: number
}

export interface Workflow {
  id: string
  name: string
  description?: string
  isActive: boolean
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
  createdAt: string
  updatedAt: string
  lastExecutedAt?: string
  executionCount: number
  userId: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  triggeredBy: string
  startedAt: string
  completedAt?: string
  error?: string
  actionsCompleted: number
  totalActions: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'productivity' | 'communication' | 'organization' | 'custom'
  triggers: Omit<WorkflowTrigger, 'id'>[]
  actions: Omit<WorkflowAction, 'id'>[]
  popularity: number
}

// Workflow API client
export const workflowApi = {
  // Workflows
  async getWorkflows(): Promise<ApiResponse<Workflow[]>> {
    return apiClient.get('/workflows')
  },

  async getWorkflow(id: string): Promise<ApiResponse<Workflow>> {
    return apiClient.get(`/workflows/${id}`)
  },

  async createWorkflow(data: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    return apiClient.post('/workflows', data)
  },

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    return apiClient.put(`/workflows/${id}`, data)
  },

  async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/workflows/${id}`)
  },

  async toggleWorkflow(id: string, isActive: boolean): Promise<ApiResponse<Workflow>> {
    return apiClient.patch(`/workflows/${id}/toggle`, { isActive })
  },

  // Executions
  async getExecutions(workflowId?: string): Promise<ApiResponse<WorkflowExecution[]>> {
    const params = workflowId ? `?workflowId=${workflowId}` : ''
    return apiClient.get(`/workflows/executions${params}`)
  },

  async getExecution(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.get(`/workflows/executions/${id}`)
  },

  async triggerWorkflow(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.post(`/workflows/${id}/trigger`, {})
  },

  // Templates
  async getTemplates(category?: string): Promise<ApiResponse<WorkflowTemplate[]>> {
    const params = category ? `?category=${category}` : ''
    return apiClient.get(`/workflows/templates${params}`)
  },

  async createFromTemplate(templateId: string, customizations?: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    return apiClient.post('/workflows/from-template', { templateId, ...customizations })
  },

  // Validation
  async validateWorkflow(workflow: Partial<Workflow>): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>> {
    return apiClient.post('/workflows/validate', workflow)
  },
}

// Helper functions
export function getTriggerTypeIcon(type: WorkflowTrigger['type']): string {
  const icons = {
    email_received: '📧',
    calendar_event: '📅',
    time_based: '⏰',
    task_created: '✅',
    manual: '👆',
  }
  return icons[type] || '🔧'
}

export function getActionTypeIcon(type: WorkflowAction['type']): string {
  const icons = {
    create_task: '✅',
    send_email: '📧',
    create_event: '📅',
    update_task: '📝',
    notify: '🔔',
    ai_process: '🤖',
  }
  return icons[type] || '⚡'
}

export function getTriggerTypeLabel(type: WorkflowTrigger['type']): string {
  const labels = {
    email_received: 'Email Received',
    calendar_event: 'Calendar Event',
    time_based: 'Time Based',
    task_created: 'Task Created',
    manual: 'Manual Trigger',
  }
  return labels[type] || type
}

export function getActionTypeLabel(type: WorkflowAction['type']): string {
  const labels = {
    create_task: 'Create Task',
    send_email: 'Send Email',
    create_event: 'Create Event',
    update_task: 'Update Task',
    notify: 'Send Notification',
    ai_process: 'AI Processing',
  }
  return labels[type] || type
}

export function getWorkflowCategoryLabel(category: WorkflowTemplate['category']): string {
  const labels = {
    productivity: 'Productivity',
    communication: 'Communication',
    organization: 'Organization',
    custom: 'Custom',
  }
  return labels[category] || category
}

export function getWorkflowStatusColor(status: WorkflowExecution['status']): string {
  const colors = {
    pending: 'text-yellow-600 bg-yellow-50',
    running: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  }
  return colors[status] || 'text-gray-600 bg-gray-50'
}