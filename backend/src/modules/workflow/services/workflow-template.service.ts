import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import {
  WorkflowTemplate,
  WorkflowTrigger,
  WorkflowAction,
  TriggerType,
  ActionType,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class WorkflowTemplateService {
  private readonly logger = new Logger(WorkflowTemplateService.name);
  private readonly templates = new Map<string, WorkflowTemplate>();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {
    this.loadDefaultTemplates();
  }

  /**
   * Get all available templates
   */
  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    const cached = await this.cacheService.get<WorkflowTemplate[]>('workflow:templates');
    if (cached) {
      return category ? cached.filter(t => t.category === category) : cached;
    }

    const templates = Array.from(this.templates.values());
    const filtered = category ? templates.filter(t => t.category === category) : templates;

    await this.cacheService.set('workflow:templates', filtered, 3600);
    return filtered;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: Record<string, any>
  ): Promise<{
    triggers: WorkflowTrigger[];
    actions: WorkflowAction[];
  }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new BusinessException('Template not found', 'TEMPLATE_NOT_FOUND');
    }

    // Customize triggers
    const triggers = template.triggers.map(trigger => ({
      ...trigger,
      id: `${userId}-${trigger.id}-${Date.now()}`,
      metadata: {
        ...trigger.metadata,
        ...customizations?.triggers?.[trigger.id],
      },
    }));

    // Customize actions
    const actions = template.commonActions.map(action => ({
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      parameters: {
        ...action.parameters,
        ...customizations?.actions?.[action.id],
      },
    }));

    // Record template usage
    await this.recordTemplateUsage(userId, templateId);

    return { triggers, actions };
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    // Email Management Template
    this.templates.set('email-management', {
      id: 'email-management',
      name: 'Smart Email Management',
      description: 'Automatically categorize, prioritize, and draft responses to emails',
      category: 'productivity',
      triggers: [
        {
          id: 'email-received-trigger',
          type: TriggerType.EMAIL_RECEIVED,
          conditions: [],
          enabled: true,
          metadata: {
            filterImportant: true,
          },
        },
      ],
      commonActions: [
        {
          id: 'categorize-email',
          type: ActionType.ANALYZE_DATA,
          name: 'Categorize Email',
          description: 'Analyze and categorize incoming email',
          parameters: {
            required: {
              emailId: { type: 'string', description: 'Email to analyze' },
            },
          },
          requires: [],
          effects: [{ type: 'updates', target: 'email', description: 'Adds category to email' }],
          reversible: true,
        },
        {
          id: 'draft-response',
          type: ActionType.GENERATE_CONTENT,
          name: 'Draft Email Response',
          description: 'Generate appropriate email response',
          parameters: {
            required: {
              emailId: { type: 'string', description: 'Email to respond to' },
              tone: { type: 'string', description: 'Response tone', default: 'professional' },
            },
          },
          requires: [{ type: 'permission', details: { scope: 'email.draft' } }],
          effects: [{ type: 'creates', target: 'draft', description: 'Creates email draft' }],
          reversible: true,
        },
      ],
      requiredIntegrations: ['gmail', 'outlook'],
      estimatedTimeSaving: 60, // minutes per week
      popularity: 95,
      tags: ['email', 'productivity', 'communication'],
    });

    // Task Automation Template
    this.templates.set('task-automation', {
      id: 'task-automation',
      name: 'Intelligent Task Management',
      description: 'Automatically organize, prioritize, and schedule tasks based on context',
      category: 'productivity',
      triggers: [
        {
          id: 'morning-planning',
          type: TriggerType.TIME_BASED,
          conditions: [],
          enabled: true,
          metadata: {
            cronPattern: '0 8 * * *', // 8 AM daily
          },
        },
        {
          id: 'task-overdue',
          type: TriggerType.TASK_STATUS,
          conditions: [
            {
              field: 'status',
              operator: 'equals' as any,
              value: 'overdue',
            },
          ],
          enabled: true,
        },
      ],
      commonActions: [
        {
          id: 'prioritize-tasks',
          type: ActionType.UPDATE_TASK,
          name: 'Prioritize Tasks',
          description: 'Update task priorities based on urgency and importance',
          parameters: {
            required: {
              taskIds: { type: 'array', description: 'Tasks to prioritize' },
            },
          },
          requires: [],
          effects: [{ type: 'updates', target: 'task', description: 'Updates task priorities' }],
          reversible: true,
        },
        {
          id: 'schedule-focus-time',
          type: ActionType.SCHEDULE_EVENT,
          name: 'Schedule Focus Time',
          description: 'Block calendar time for important tasks',
          parameters: {
            required: {
              duration: { type: 'number', description: 'Duration in minutes', default: 90 },
              title: { type: 'string', description: 'Session title', default: 'Focus Time' },
            },
          },
          requires: [{ type: 'integration', details: { service: 'calendar' } }],
          effects: [
            { type: 'creates', target: 'calendar_event', description: 'Creates calendar block' },
          ],
          reversible: true,
        },
      ],
      requiredIntegrations: ['calendar'],
      estimatedTimeSaving: 120,
      popularity: 88,
      tags: ['tasks', 'productivity', 'planning'],
    });

    // Meeting Preparation Template
    this.templates.set('meeting-prep', {
      id: 'meeting-prep',
      name: 'Smart Meeting Preparation',
      description: 'Automatically prepare for meetings with briefs, talking points, and follow-ups',
      category: 'meetings',
      triggers: [
        {
          id: 'upcoming-meeting',
          type: TriggerType.CALENDAR_EVENT,
          conditions: [],
          enabled: true,
          metadata: {
            minutesBefore: 30,
            eventTypes: ['meeting'],
          },
        },
      ],
      commonActions: [
        {
          id: 'generate-brief',
          type: ActionType.GENERATE_CONTENT,
          name: 'Generate Meeting Brief',
          description: 'Create meeting preparation document',
          parameters: {
            required: {
              eventId: { type: 'string', description: 'Calendar event ID' },
            },
          },
          requires: [{ type: 'integration', details: { service: 'calendar' } }],
          effects: [{ type: 'creates', target: 'document', description: 'Creates meeting brief' }],
          reversible: false,
        },
        {
          id: 'create-agenda',
          type: ActionType.CREATE_TASK,
          name: 'Create Meeting Agenda',
          description: 'Generate agenda items as tasks',
          parameters: {
            required: {
              meetingTitle: { type: 'string', description: 'Meeting title' },
              attendees: { type: 'array', description: 'Meeting attendees' },
            },
          },
          requires: [],
          effects: [{ type: 'creates', target: 'task', description: 'Creates agenda tasks' }],
          reversible: true,
        },
      ],
      requiredIntegrations: ['calendar', 'email'],
      estimatedTimeSaving: 45,
      popularity: 76,
      tags: ['meetings', 'preparation', 'productivity'],
    });

    // Weekly Review Template
    this.templates.set('weekly-review', {
      id: 'weekly-review',
      name: 'Automated Weekly Review',
      description: 'Generate weekly summaries, insights, and planning for the upcoming week',
      category: 'planning',
      triggers: [
        {
          id: 'friday-review',
          type: TriggerType.TIME_BASED,
          conditions: [],
          enabled: true,
          metadata: {
            cronPattern: '0 16 * * 5', // 4 PM Friday
          },
        },
      ],
      commonActions: [
        {
          id: 'generate-summary',
          type: ActionType.ANALYZE_DATA,
          name: 'Generate Weekly Summary',
          description: "Analyze week's activities and generate insights",
          parameters: {
            required: {
              timeRange: { type: 'string', description: 'Time range', default: '7d' },
            },
          },
          requires: [],
          effects: [{ type: 'creates', target: 'report', description: 'Creates weekly summary' }],
          reversible: false,
        },
        {
          id: 'plan-next-week',
          type: ActionType.CREATE_TASK,
          name: 'Plan Next Week',
          description: 'Create tasks for next week based on insights',
          parameters: {
            required: {
              insights: { type: 'object', description: 'Weekly insights' },
            },
          },
          requires: [],
          effects: [{ type: 'creates', target: 'task', description: 'Creates planning tasks' }],
          reversible: true,
        },
      ],
      requiredIntegrations: [],
      estimatedTimeSaving: 90,
      popularity: 82,
      tags: ['planning', 'review', 'productivity'],
    });

    // Smart Delegation Template
    this.templates.set('smart-delegation', {
      id: 'smart-delegation',
      name: 'Intelligent Delegation',
      description: 'Identify tasks to delegate and automate the delegation process',
      category: 'teamwork',
      triggers: [
        {
          id: 'workload-high',
          type: TriggerType.CONTEXT_BASED,
          conditions: [
            {
              field: 'taskCount',
              operator: 'greater_than' as any,
              value: 15,
            },
          ],
          enabled: true,
          metadata: {
            checkInterval: 3600000, // Check hourly
          },
        },
      ],
      commonActions: [
        {
          id: 'identify-delegatable',
          type: ActionType.ANALYZE_DATA,
          name: 'Identify Delegatable Tasks',
          description: 'Analyze tasks to find delegation candidates',
          parameters: {
            required: {
              userId: { type: 'string', description: 'User ID' },
            },
          },
          requires: [],
          effects: [
            { type: 'creates', target: 'analysis', description: 'Creates delegation analysis' },
          ],
          reversible: false,
        },
        {
          id: 'draft-delegation-email',
          type: ActionType.GENERATE_CONTENT,
          name: 'Draft Delegation Email',
          description: 'Create delegation request email',
          parameters: {
            required: {
              tasks: { type: 'array', description: 'Tasks to delegate' },
              recipient: { type: 'string', description: 'Delegation recipient' },
            },
          },
          requires: [],
          effects: [{ type: 'creates', target: 'draft', description: 'Creates email draft' }],
          reversible: true,
        },
      ],
      requiredIntegrations: ['email'],
      estimatedTimeSaving: 180,
      popularity: 65,
      tags: ['delegation', 'teamwork', 'management'],
    });
  }

  /**
   * Record template usage
   */
  private async recordTemplateUsage(userId: string, templateId: string): Promise<void> {
    try {
      await this.prisma.workflowTemplateUsage.create({
        data: {
          userId,
          templateId,
          usedAt: new Date(),
        },
      });

      // Update template popularity
      const template = this.templates.get(templateId);
      if (template) {
        template.popularity = Math.min(100, template.popularity + 0.1);
      }
    } catch (error) {
      this.logger.warn(`Failed to record template usage: ${error}`);
    }
  }

  /**
   * Get recommended templates for user
   */
  async getRecommendedTemplates(userId: string): Promise<WorkflowTemplate[]> {
    // Get user's integration status
    const integrations = await this.prisma.integration.findMany({
      where: { userId, status: 'active' },
      select: { provider: true },
    });

    const activeProviders = new Set(integrations.map(i => i.provider));

    // Filter templates based on available integrations
    const templates = Array.from(this.templates.values())
      .filter(template => template.requiredIntegrations.every(req => activeProviders.has(req)))
      .sort((a, b) => b.popularity - a.popularity);

    return templates.slice(0, 5);
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.templates.values()).filter(
      template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
