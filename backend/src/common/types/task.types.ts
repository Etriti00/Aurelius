// Task management type definitions
// Professional implementation without shortcuts

import { PaginationParams } from './index';

// Task enums based on Prisma schema
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedMinutes?: number;
  projectId?: string;
  labels?: string[];
  metadata?: TaskMetadata;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date | null;
  completedAt?: Date | null;
  actualMinutes?: number;
  estimatedMinutes?: number;
  projectId?: string | null;
  labels?: string[];
  metadata?: TaskMetadata;
}

export interface TaskMetadata {
  source?: string;
  aiGenerated?: boolean;
  integrationId?: string;
  externalId?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface TaskFilter extends PaginationParams {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  projectId?: string;
  label?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  search?: string;
}

export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  averageCompletionTime: number;
}

export interface TaskAnalytics {
  completionRate: number;
  averageTimeToComplete: number;
  overdueRate: number;
  productivityScore: number;
  trendsOverTime: TaskTrend[];
}

export interface TaskTrend {
  date: Date;
  completed: number;
  created: number;
  overdue: number;
}

export interface TaskSuggestion {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  confidence: number;
  reasoning: string;
}

export interface BulkTaskOperation {
  taskIds: string[];
  operation: 'update' | 'delete' | 'archive';
  data?: UpdateTaskData;
}
