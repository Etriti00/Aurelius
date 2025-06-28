'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  Plus, 
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Flag,
  Trash2,
  Edit3
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tasksApi, getPriorityColor, useTasks } from '@/lib/api/tasks'
import type { Task } from '@/lib/api/types'
import { TaskStatus, Priority } from '@/lib/api/types'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

export default function TasksPage() {
  const { status } = useSession()
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed'>('all')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    dueDate: ''
  })
  
  // Fetch tasks
  const { tasks, mutate } = useTasks()

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Filter tasks
  const filteredTasks = (tasks || []).filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && task.status !== TaskStatus.COMPLETED) ||
      (selectedTab === 'completed' && task.status === TaskStatus.COMPLETED)
    
    return matchesSearch && matchesTab
  })

  // Group tasks by status
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === TaskStatus.TODO),
    in_progress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
    completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED),
  }

  // Handle task status update
  const handleUpdateStatus = async (taskId: string, status: Task['status']) => {
    try {
      await tasksApi.updateTask(taskId, { status })
      mutate()
    } catch (error) {
      alert('Failed to update task status')
    }
  }

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksApi.deleteTask(taskId)
        mutate()
      } catch (error) {
        alert('Failed to delete task')
      }
    }
  }

  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTaskData.title) {
      alert('Please enter a task title')
      return
    }

    try {
      await tasksApi.createTask({
        title: newTaskData.title,
        description: newTaskData.description,
        status: TaskStatus.TODO,
        priority: newTaskData.priority,
        dueDate: newTaskData.dueDate || undefined,
      })
      
      // Reset form
      setNewTaskData({
        title: '',
        description: '',
        priority: Priority.MEDIUM,
        dueDate: ''
      })
      setIsCreatingTask(false)
      mutate()
    } catch (error) {
      alert('Failed to create task')
    }
  }

  const StatusIcon = ({ status }: { status: Task['status'] }) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      case TaskStatus.IN_PROGRESS:
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    }
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className="liquid-glass hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={() => handleUpdateStatus(
                task.id, 
                task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED
              )}
              className="mt-0.5"
            >
              <StatusIcon status={task.status} />
            </button>
            <div className="flex-1">
              <h4 className={cn(
                "font-medium",
                task.status === TaskStatus.COMPLETED && "line-through text-gray-500 dark:text-gray-400"
              )}>
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                {task.dueDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 dark:text-gray-400" />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </span>
                )}
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getPriorityColor(task.priority))}
                >
                  <Flag className="h-3 w-3 mr-1 dark:text-current" />
                  {task.priority}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => alert('Edit functionality coming soon!')}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950/40" />
      </div>

      <div className={`${isCommandCenterOpen ? '' : 'container mx-auto px-3 sm:px-4 lg:px-8'}`}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header Card */}
          <div className="liquid-glass-accent rounded-3xl p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">Manage your tasks and stay organized</p>
              </div>
              <Button 
                className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                onClick={() => setIsCreatingTask(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 liquid-glass-subtle border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
          />
        </div>
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 dark:text-gray-100">
              <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              To Do
            </h3>
            <Badge variant="secondary">{tasksByStatus.todo.length}</Badge>
          </div>
          <div className="space-y-3">
            {tasksByStatus.todo.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasksByStatus.todo.length === 0 && (
              <Card className="liquid-glass border-dashed">
                <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No tasks to do
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 dark:text-gray-100">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              In Progress
            </h3>
            <Badge variant="secondary">{tasksByStatus.in_progress.length}</Badge>
          </div>
          <div className="space-y-3">
            {tasksByStatus.in_progress.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasksByStatus.in_progress.length === 0 && (
              <Card className="liquid-glass border-dashed">
                <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No tasks in progress
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 dark:text-gray-100">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              Completed
            </h3>
            <Badge variant="secondary">{tasksByStatus.completed.length}</Badge>
          </div>
          <div className="space-y-3">
            {tasksByStatus.completed.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasksByStatus.completed.length === 0 && (
              <Card className="liquid-glass border-dashed">
                <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No completed tasks
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your list. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTaskData.title}
                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                placeholder="Enter task description (optional)"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTaskData.priority}
                onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value as Priority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Priority.LOW}>Low</SelectItem>
                  <SelectItem value={Priority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={Priority.HIGH}>High</SelectItem>
                  <SelectItem value={Priority.URGENT}>Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTaskData.dueDate}
                onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingTask(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  )
}