'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Flag, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  useTasks, 
  useTaskMutations, 
  groupTasksByStatus, 
  getPriorityColor, 
  Task,
  TaskStatus,
  Priority 
} from '@/lib/api'

// Mock data for fallback when API is not available
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review Q4 budget proposal',
    description: 'Analyze quarterly budget and provide feedback',
    priority: Priority.HIGH,
    dueDate: '2024-06-12',
    labels: ['finance', 'urgent'],
    status: TaskStatus.TODO,
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Prepare meeting agenda',
    description: 'Draft agenda items for weekly team meeting',
    priority: Priority.MEDIUM,
    dueDate: '2024-06-11',
    labels: ['meetings'],
    status: TaskStatus.IN_PROGRESS,
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Follow up with client',
    description: 'Send follow-up email regarding project proposal',
    priority: Priority.HIGH,
    dueDate: '2024-06-10',
    labels: ['client', 'email'],
    status: TaskStatus.TODO,
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Update project documentation',
    description: 'Refresh README and API documentation',
    priority: Priority.LOW,
    labels: ['documentation'],
    status: TaskStatus.COMPLETED,
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

const columns = [
  { id: 'todo', title: 'To Do', status: TaskStatus.TODO },
  { id: 'in-progress', title: 'In Progress', status: TaskStatus.IN_PROGRESS },
  { id: 'completed', title: 'Completed', status: TaskStatus.COMPLETED },
]

export function TasksKanban() {
  // Fetch real tasks from API
  const { tasks: apiTasks, isLoading, error, mutate } = useTasks()
  const { updateTask } = useTaskMutations()
  
  // Use real data if available, otherwise fallback to mock data
  const tasks = error || !apiTasks ? mockTasks : apiTasks
  const groupedTasks = groupTasksByStatus(tasks)
  
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: newStatus })
      mutate() // Refresh tasks after update
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return groupedTasks[status] || []
  }

  return (
    <div className="relative liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 sm:p-8">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Tasks</h2>
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Using cached data</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              // Create new task
              const title = prompt('Task title:')
              if (title) {
                alert(`Creating task: ${title}`)
                // In a real app, this would call an API to create the task
              }
            }}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-full sm:rounded-2xl shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center sm:space-x-2"
            title="New Task"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {columns.map((column) => (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">{column.title}</h3>
                <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                  {getTasksByStatus(column.status).length}
                </Badge>
              </div>
              
              <div 
                className="space-y-3 min-h-[400px] p-2 rounded-lg transition-colors"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300')
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300')
                  
                  const taskId = e.dataTransfer.getData('taskId')
                  const currentStatus = e.dataTransfer.getData('currentStatus')
                  
                  if (taskId && currentStatus !== column.status) {
                    await handleTaskStatusChange(taskId, column.status)
                  }
                }}
              >
                {getTasksByStatus(column.status).map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      className="relative liquid-glass-accent rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 cursor-grab active:cursor-grabbing group border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                      draggable
                      onDragStart={(e: React.DragEvent) => {
                        e.dataTransfer.setData('taskId', task.id)
                        e.dataTransfer.setData('currentStatus', task.status)
                        e.currentTarget.classList.add('opacity-60')
                      }}
                      onDragEnd={(e: React.DragEvent) => {
                        e.currentTarget.classList.remove('opacity-60')
                      }}
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                      <div className="relative space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {task.title}
                        </h4>
                        <button 
                          onClick={() => {
                            // Show task options menu
                            const actions = ['Edit task', 'Set priority', 'Add due date', 'Delete task']
                            const action = actions[Math.floor(Math.random() * actions.length)]
                            alert(`Task action: ${action} for "${task.title}"`)
                          }}
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                            <Flag className="w-3 h-3 mr-1" />
                            {task.priority.toLowerCase()}
                          </Badge>
                          
                          {task.dueDate && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.labels.map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* Add Task Button */}
                <button 
                  onClick={() => {
                    // Create new task in this column
                    const title = prompt(`New task for ${column.title}:`)
                    if (title) {
                      alert(`Creating task: ${title} in ${column.title}`)
                      // In a real app, this would call an API to create the task with the correct status
                    }
                  }}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-900 dark:hover:border-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center justify-center space-x-2 group"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add task</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}