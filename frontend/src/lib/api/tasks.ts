import useSWR from 'swr'
import { apiClient } from './client'
import { Task, TaskStats, CreateTaskDto, UpdateTaskDto, TaskStatus, Priority } from './types'

// API endpoints
const TASKS_ENDPOINT = '/tasks'

// API functions
export const tasksApi = {
  // Get all tasks with optional filters
  getTasks: (filters?: {
    status?: TaskStatus
    priority?: Priority
    search?: string
    labels?: string[]
    dueDate?: string
  }) => apiClient.get<Task[]>(TASKS_ENDPOINT, filters),

  // Get task by ID
  getTask: (id: string) => apiClient.get<Task>(`${TASKS_ENDPOINT}/${id}`),

  // Get task statistics
  getTaskStats: () => apiClient.get<TaskStats>(`${TASKS_ENDPOINT}/stats`),

  // Create new task
  createTask: (data: CreateTaskDto) => apiClient.post<Task>(TASKS_ENDPOINT, data),

  // Update task
  updateTask: (id: string, data: UpdateTaskDto) => apiClient.patch<Task>(`${TASKS_ENDPOINT}/${id}`, data),

  // Delete task
  deleteTask: (id: string) => apiClient.delete(`${TASKS_ENDPOINT}/${id}`),

  // Bulk update tasks (for drag and drop)
  bulkUpdateTasks: (updates: Array<{ id: string; status?: TaskStatus; priority?: Priority }>) =>
    apiClient.post(`${TASKS_ENDPOINT}/bulk-update`, { updates }),
}

// SWR Hooks
export const useTasks = (filters?: {
  status?: TaskStatus
  priority?: Priority
  search?: string
  labels?: string[]
  dueDate?: string
}) => {
  const { data, error, isLoading, mutate } = useSWR(
    [TASKS_ENDPOINT, filters],
    () => tasksApi.getTasks(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  )

  return {
    tasks: data,
    error,
    isLoading,
    mutate,
    // Helper methods for common operations
    refresh: () => mutate(),
  }
}

export const useTask = (id: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `${TASKS_ENDPOINT}/${id}` : null,
    () => tasksApi.getTask(id),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    task: data,
    error,
    isLoading,
    mutate,
  }
}

export const useTaskStats = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${TASKS_ENDPOINT}/stats`,
    tasksApi.getTaskStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    stats: data,
    error,
    isLoading,
    mutate,
  }
}

// Helper functions for optimistic updates
export const useTaskMutations = () => {
  const createTask = async (data: CreateTaskDto) => {
    try {
      const newTask = await tasksApi.createTask(data)
      // Trigger revalidation of tasks list
      // SWR will automatically revalidate related queries
      return newTask
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, data: UpdateTaskDto) => {
    try {
      const updatedTask = await tasksApi.updateTask(id, data)
      return updatedTask
    } catch (error) {
      console.error('Failed to update task:', error)
      throw error
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await tasksApi.deleteTask(id)
    } catch (error) {
      console.error('Failed to delete task:', error)
      throw error
    }
  }

  const bulkUpdateTasks = async (updates: Array<{ id: string; status?: TaskStatus; priority?: Priority }>) => {
    try {
      await tasksApi.bulkUpdateTasks(updates)
    } catch (error) {
      console.error('Failed to bulk update tasks:', error)
      throw error
    }
  }

  return {
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
  }
}

// Helper to group tasks by status for Kanban board
export const groupTasksByStatus = (tasks: Task[] = []) => {
  return {
    [TaskStatus.TODO]: tasks.filter(task => task.status === TaskStatus.TODO),
    [TaskStatus.IN_PROGRESS]: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.COMPLETED]: tasks.filter(task => task.status === TaskStatus.COMPLETED),
    [TaskStatus.ARCHIVED]: tasks.filter(task => task.status === TaskStatus.ARCHIVED),
  }
}

// Helper to get priority color
export const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case Priority.URGENT:
      return 'text-red-600 bg-red-100'
    case Priority.HIGH:
      return 'text-orange-600 bg-orange-100'
    case Priority.MEDIUM:
      return 'text-yellow-600 bg-yellow-100'
    case Priority.LOW:
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

// Helper to get status color
export const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
      return 'text-gray-600 bg-gray-100'
    case TaskStatus.IN_PROGRESS:
      return 'text-blue-600 bg-blue-100'
    case TaskStatus.COMPLETED:
      return 'text-green-600 bg-green-100'
    case TaskStatus.ARCHIVED:
      return 'text-purple-600 bg-purple-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}