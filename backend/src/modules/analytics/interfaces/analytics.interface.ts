import { Usage, UsageHistory } from '@prisma/client';

export interface UsageSummary {
  totalActions: number;
  averageDaily: number;
  peakDay: Date | null;
  growth: number;
}

export interface UsageAnalytics {
  current: Usage | null;
  history: UsageHistory[];
  summary: UsageSummary;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  cacheHitRate: number;
  successRate: number;
  actionsByType: Record<string, number>;
  performanceByHour: Array<{ hour: number; avgResponseTime: number; requestCount: number }>;
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ActivityTimelineItem {
  date: string;
  activityCount: number;
  actions: Array<{ type: string; count: number }>;
}

export interface IntegrationAnalytics {
  provider: string;
  totalSyncs: number;
  successRate: number;
  lastSync: Date | null;
  errors: string[];
}
