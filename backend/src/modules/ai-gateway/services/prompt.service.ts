import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate, PromptCategory, PromptContext } from '../interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);
  private templates: Map<string, PromptTemplate> = new Map();

  constructor(private prisma: PrismaService) {
    this.loadDefaultTemplates();
    this.logger.debug('Prompt service initialized with Prisma client');
  }

  private loadDefaultTemplates() {
    // Email templates
    this.templates.set('email-draft', {
      id: 'email-draft',
      name: 'Email Draft',
      category: PromptCategory.EMAIL,
      template: `As {{user.name}}'s AI assistant, draft a professional email based on the following context:

Recipient: {{recipient}}
Subject: {{subject}}
Context: {{context}}
Tone: {{tone}}

User preferences:
{{#each user.preferences}}
- {{@key}}: {{this}}
{{/each}}

Draft a complete email that:
1. Is professional and appropriate for the context
2. Maintains the requested tone
3. Is clear and concise
4. Includes a proper greeting and closing`,
      variables: [
        { name: 'recipient', type: 'string', required: true, description: 'Email recipient' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject' },
        { name: 'context', type: 'string', required: true, description: 'Email context' },
        {
          name: 'tone',
          type: 'string',
          required: false,
          defaultValue: 'professional',
          description: 'Email tone',
        },
      ],
      maxTokens: 500,
      temperature: 0.7,
    });

    // Task generation
    this.templates.set('task-breakdown', {
      id: 'task-breakdown',
      name: 'Task Breakdown',
      category: PromptCategory.TASK,
      template: `Break down the following task into actionable subtasks:

Task: {{task}}
Context: {{context}}
Due Date: {{dueDate}}

Consider:
1. The user's current workload
2. Task dependencies
3. Optimal scheduling
4. Required resources

Provide a structured breakdown with:
- Clear subtask descriptions
- Estimated time for each
- Suggested order of completion
- Any prerequisites`,
      variables: [
        { name: 'task', type: 'string', required: true, description: 'Main task description' },
        { name: 'context', type: 'string', required: false, description: 'Additional context' },
        { name: 'dueDate', type: 'string', required: false, description: 'Task due date' },
      ],
      maxTokens: 600,
      temperature: 0.5,
    });

    // Meeting preparation
    this.templates.set('meeting-prep', {
      id: 'meeting-prep',
      name: 'Meeting Preparation',
      category: PromptCategory.CALENDAR,
      template: `Prepare for the following meeting:

Meeting: {{title}}
Attendees: {{attendees}}
Duration: {{duration}}
Agenda: {{agenda}}

Recent interactions with attendees:
{{#each recentInteractions}}
- {{this}}
{{/each}}

Provide:
1. Key talking points
2. Questions to ask
3. Potential action items
4. Background information on attendees
5. Suggested follow-up actions`,
      variables: [
        { name: 'title', type: 'string', required: true, description: 'Meeting title' },
        { name: 'attendees', type: 'array', required: true, description: 'List of attendees' },
        { name: 'duration', type: 'string', required: true, description: 'Meeting duration' },
        { name: 'agenda', type: 'string', required: false, description: 'Meeting agenda' },
        {
          name: 'recentInteractions',
          type: 'array',
          required: false,
          defaultValue: [],
          description: 'Recent interactions',
        },
      ],
      maxTokens: 800,
      temperature: 0.6,
    });

    // Daily summary
    this.templates.set('daily-summary', {
      id: 'daily-summary',
      name: 'Daily Summary',
      category: PromptCategory.SUMMARY,
      template: `Create a comprehensive daily summary for {{user.name}}:

Date: {{date}}
Timezone: {{user.timezone}}

Completed tasks:
{{#each completedTasks}}
- {{this.title}} ({{this.duration}})
{{/each}}

Upcoming tasks:
{{#each upcomingTasks}}
- {{this.title}} (Due: {{this.dueDate}})
{{/each}}

Meetings attended:
{{#each meetings}}
- {{this.title}} with {{this.attendees}}
{{/each}}

Emails processed: {{emailCount}}

Provide:
1. Key accomplishments
2. Progress insights
3. Tomorrow's priorities
4. Suggested optimizations
5. Wellness check (work-life balance)`,
      variables: [
        { name: 'date', type: 'string', required: true, description: 'Summary date' },
        { name: 'completedTasks', type: 'array', required: true, description: 'Completed tasks' },
        { name: 'upcomingTasks', type: 'array', required: true, description: 'Upcoming tasks' },
        { name: 'meetings', type: 'array', required: true, description: 'Meetings attended' },
        {
          name: 'emailCount',
          type: 'number',
          required: true,
          description: 'Number of emails processed',
        },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    });
  }

  async getTemplate(id: string): Promise<PromptTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplatesByCategory(category: PromptCategory): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  async renderPrompt(
    templateId: string,
    variables: Record<string, string | number | boolean | string[] | Record<string, unknown>>,
    context?: PromptContext
  ): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Merge context with variables
    const data = {
      ...variables,
      user: context?.user,
      memory: context?.memory,
      integrations: context?.integrations,
      recentActions: context?.recentActions,
    };

    // Simple template rendering (in production, use a proper template engine)
    let rendered = template.template;

    // Replace variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // Handle arrays with #each
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    rendered = rendered.replace(eachRegex, (_, arrayName, content) => {
      // Type-safe array access
      const arrayValue = data[arrayName as keyof typeof data];
      if (!Array.isArray(arrayValue)) return '';
      const array = arrayValue;

      return array
        .map(item => {
          let itemContent = content;
          if (typeof item === 'object') {
            Object.entries(item).forEach(([key, value]) => {
              const itemRegex = new RegExp(`{{this\.${key}}}`, 'g');
              itemContent = itemContent.replace(itemRegex, String(value));
            });
          } else {
            itemContent = itemContent.replace(/{{this}}/g, String(item));
          }
          return itemContent;
        })
        .join('');
    });

    return rendered;
  }

  async createCustomTemplate(
    userId: string,
    template: Omit<PromptTemplate, 'id'>
  ): Promise<PromptTemplate> {
    // Store custom templates in database
    this.logger.debug(`Creating custom template for user ${userId}`);
    const id = `custom-${userId}-${Date.now()}`;
    const newTemplate = { ...template, id };

    // Store in memory
    this.templates.set(id, newTemplate);

    // Store user activity in database for tracking
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          type: 'prompt_template_created',
          category: 'ai',
          description: `Created custom prompt template: ${template.name}`,
          metadata: {
            templateId: id,
            category: template.category,
            templateName: template.name,
          },
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log template creation activity', error);
    }

    return newTemplate;
  }

  async getUserTemplates(userId: string): Promise<PromptTemplate[]> {
    // Fetch user's custom templates from database
    this.logger.debug(`Fetching templates for user ${userId}`);

    // Filter memory templates for this user
    const userTemplates = Array.from(this.templates.values()).filter(template =>
      template.id.includes(`custom-${userId}-`)
    );

    // Log user activity for analytics
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          type: 'prompt_templates_accessed',
          category: 'ai',
          description: `Accessed prompt templates (${userTemplates.length} custom templates)`,
          metadata: {
            templateCount: userTemplates.length,
            templateIds: userTemplates.map(t => t.id),
          },
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log template access activity', error);
    }

    return userTemplates;
  }
}
