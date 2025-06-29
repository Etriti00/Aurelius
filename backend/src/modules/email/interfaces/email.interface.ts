import { Email, EmailThread } from '@prisma/client';

export interface EmailFilters {
  isRead?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  isArchived?: boolean;
  status?: 'draft' | 'sent' | 'received' | 'archived';
  provider?: string;
  labels?: string[];
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

export interface EmailThreadWithEmails extends EmailThread {
  emails: Email[];
}

export interface EmailResponse {
  id: string;
  subject: string;
  threadId: string;
  provider: string;
  lastMessageAt: Date;
  isRead: boolean;
  isImportant: boolean;
  isArchived: boolean;
  labels: string[];
  participants: string[];
  messageCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  emails: EmailDetail[];
}

export interface EmailDetail {
  id: string;
  messageId: string | null;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  bodyHtml: string | null;
  status: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  aiDrafted: boolean;
  aiSummary: string | null;
  aiCategory: string | null;
  aiPriority: number;
  sentiment: string | null;
  sentAt: Date | null;
  receivedAt: Date | null;
  attachments: unknown[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface EmailStats {
  total: number;
  unread: number;
  important: number;
  archived?: number;
  starred?: number;
  sent?: number;
  received?: number;
  drafts?: number;
}

export interface SendEmailRequest {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  content: string;
  html?: string;
  attachments?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface SendEmailResponse {
  id: string;
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}

export interface EmailBatchUpdateRequest {
  emailIds: string[];
  updates: {
    isRead?: boolean;
    isStarred?: boolean;
    isImportant?: boolean;
    isArchived?: boolean;
    labels?: string[];
  };
}

export interface EmailBatchUpdateResponse {
  updated: number;
  failed: number;
  errors?: string[];
}

export interface EmailSearchRequest {
  query: string;
  filters?: EmailFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'relevance' | 'sender' | 'subject';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailSearchResponse {
  emails: EmailResponse[];
  total: number;
  hasMore: boolean;
  searchTime: number;
}

export interface EmailNotificationPreferences {
  enabled: boolean;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  types: ('new_email' | 'important_email' | 'mentions' | 'reminders')[];
  quietHours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}
