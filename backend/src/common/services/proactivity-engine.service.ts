import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { PrismaService } from '../../modules/prisma/prisma.service';
import { AIGatewayService } from '../../modules/ai-gateway/ai-gateway.service';
import { AppWebSocketGateway } from '../../modules/websocket/websocket.gateway';

interface TriggerEvent {
  id: string;
  type: 'temporal' | 'event' | 'contextual' | 'predictive';
  priority: 'urgent' | 'important' | 'routine';
  userId: string;
  data: Record<string, any>;
  context?: Record<string, any>;
}

interface EnhancedSuggestion {
  id: string;
  type: 'TASK_CREATE' | 'EMAIL_DRAFT' | 'CALENDAR_BLOCK' | 'MEETING_PREP' | 'WORKFLOW_OPTIMIZE';
  title: string;
  description: string;
  actionType: string;
  actionData: Record<string, any>;
  confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reasoning: string;
  alternatives?: string[];
  expectedImpact: string;
  expiresAt?: Date;
}

interface UserContext {
  user: {
    id: string;
    preferences: Record<string, any>;
    subscription: {
      tier: 'PRO' | 'MAX' | 'TEAMS';
    };
  };
  workspace: {
    tasks: any[];
    emails: any[];
    calendar: any[];
    integrations: any[];
  };
  patterns: {
    workingHours: { start: string; end: string };
    activeProjects: string[];
    recentActivity: any[];
  };
  summary: string;
}

@Injectable()
export class ProactivityEngineService {
  private readonly logger = new Logger(ProactivityEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
    private readonly webSocketGateway: AppWebSocketGateway,
    @InjectQueue('proactivity') private readonly proactivityQueue: Queue
  ) {}

  // PHASE 1: INTELLIGENT TRIGGERING
  @Cron(CronExpression.EVERY_5_MINUTES)
  async temporalTriggerCheck(): Promise<void> {
    this.logger.debug('Running temporal trigger check');
    
    try {
      // Check for upcoming deadlines, meetings, and scheduled tasks
      const upcomingEvents = await this.prisma.calendarEvent.findMany({
        where: {
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 60 * 60 * 1000), // Next hour
          },
          status: 'CONFIRMED',
        },
        include: { user: { include: { subscription: true } } },
      });

      for (const event of upcomingEvents) {
        const trigger: TriggerEvent = {
          id: `temporal-meeting-${event.id}`,
          type: 'temporal',
          priority: 'important',
          userId: event.userId,
          data: { event },
          context: { triggerType: 'upcoming-meeting' },
        };

        await this.processTrigger(trigger);
      }

      // Check for overdue tasks
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        include: { user: { include: { subscription: true } } },
      });

      for (const task of overdueTasks) {
        const trigger: TriggerEvent = {
          id: `temporal-overdue-${task.id}`,
          type: 'temporal',
          priority: 'urgent',
          userId: task.userId,
          data: { task },
          context: { triggerType: 'overdue-task' },
        };

        await this.processTrigger(trigger);
      }
    } catch (error) {
      this.logger.error('Temporal trigger check failed', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async contextualTriggerCheck(): Promise<void> {
    this.logger.debug('Running contextual pattern analysis');
    
    try {
      // Find users with recent activity
      const activeUsers = await this.prisma.user.findMany({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: { subscription: true },
        take: 50, // Process in batches
      });

      for (const user of activeUsers) {
        await this.analyzeUserPatterns(user.id);
      }
    } catch (error) {
      this.logger.error('Contextual trigger check failed', error);
    }
  }

  // PHASE 2: DEEP ANALYSIS & SUGGESTION GENERATION
  async processTrigger(trigger: TriggerEvent): Promise<void> {
    try {
      // Prioritization logic
      const priority = await this.prioritizeTrigger(trigger);
      if (priority === 'ignore') return;

      // Add to processing queue based on priority
      const delay = this.getProcessingDelay(priority);
      
      await this.proactivityQueue.add(
        'process-trigger',
        trigger,
        {
          delay,
          priority: this.getPriorityScore(priority),
        }
      );

      this.logger.debug(
        `Queued trigger ${trigger.id} for user ${trigger.userId} with priority ${priority}`
      );
    } catch (error) {
      this.logger.error('Failed to process trigger', error);
    }
  }

  async analyzeUserPatterns(userId: string): Promise<void> {
    try {
      const context = await this.gatherUserContext(userId);
      
      // Analyze patterns and generate insights
      const patterns = await this.detectPatterns(context);
      
      if (patterns.length > 0) {
        const trigger: TriggerEvent = {
          id: `contextual-patterns-${userId}`,
          type: 'contextual',
          priority: 'routine',
          userId,
          data: { patterns },
          context: { triggerType: 'pattern-analysis' },
        };

        await this.processTrigger(trigger);
      }
    } catch (error) {
      this.logger.error(`Failed to analyze patterns for user ${userId}`, error);
    }
  }

  // PHASE 3: ENHANCED SUGGESTION GENERATION
  async generateEnhancedSuggestion(trigger: TriggerEvent): Promise<EnhancedSuggestion | null> {
    try {
      const context = await this.gatherUserContext(trigger.userId);
      
      // Generate suggestion using AI
      const suggestion = await this.generateAISuggestion(trigger, context);
      
      if (suggestion) {
        // Store suggestion in database
        const savedSuggestion = await this.prisma.aISuggestion.create({
          data: {
            userId: trigger.userId,
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
            actionType: suggestion.actionType,
            actionData: suggestion.actionData,
            confidence: suggestion.confidence,
            priority: suggestion.priority,
            expiresAt: suggestion.expiresAt,
          },
        });

        return {
          ...suggestion,
          id: savedSuggestion.id,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to generate enhanced suggestion', error);
      return null;
    }
  }

  // PHASE 4: SMART ACTION EXECUTION
  async executeSuggestion(
    suggestionId: string,
    approved: boolean = false
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const suggestion = await this.prisma.aISuggestion.findUnique({
        where: { id: suggestionId },
        include: { user: true },
      });

      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }

      if (suggestion.status !== 'PENDING') {
        return { success: false, error: 'Suggestion already processed' };
      }

      // Determine if auto-execution is allowed
      const canAutoExecute = this.canAutoExecute(suggestion);
      
      if (!approved && !canAutoExecute) {
        return { success: false, error: 'Manual approval required' };
      }

      // Execute the action
      const result = await this.executeAction(suggestion);

      // Update suggestion status
      await this.prisma.aISuggestion.update({
        where: { id: suggestionId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // Notify user via WebSocket
      this.webSocketGateway.sendToUser(suggestion.userId, {
        type: 'suggestion:executed',
        payload: { suggestion, result },
      });

      return { success: true, result };
    } catch (error) {
      this.logger.error('Failed to execute suggestion', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  // HELPER METHODS
  private async gatherUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        tasks: {
          where: { status: { not: 'ARCHIVED' } },
          take: 20,
          orderBy: { updatedAt: 'desc' },
        },
        emailThreads: {
          where: { isRead: false },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
        calendarEvents: {
          where: {
            startTime: { gte: new Date() },
            status: 'CONFIRMED',
          },
          take: 10,
          orderBy: { startTime: 'asc' },
        },
        integrations: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build context summary
    const contextParts = [
      `User has ${user.tasks.length} active tasks`,
      `${user.emailThreads.length} unread emails`,
      `${user.calendarEvents.length} upcoming events`,
      `${user.integrations.length} active integrations`,
    ];

    return {
      user: {
        id: user.id,
        preferences: user.preferences as Record<string, any>,
        subscription: user.subscription!,
      },
      workspace: {
        tasks: user.tasks,
        emails: user.emailThreads,
        calendar: user.calendarEvents,
        integrations: user.integrations,
      },
      patterns: {
        workingHours: { start: '09:00', end: '17:00' }, // Default, should be learned
        activeProjects: [], // To be implemented
        recentActivity: [], // To be implemented
      },
      summary: contextParts.join('. '),
    };
  }

  private async generateAISuggestion(
    trigger: TriggerEvent,
    context: UserContext
  ): Promise<EnhancedSuggestion | null> {
    const prompt = this.buildSuggestionPrompt(trigger, context);
    
    try {
      const response = await this.aiGateway.processRequest({
        prompt,
        context: context.summary,
        systemPrompt: this.getProactivitySystemPrompt(),
        userId: trigger.userId,
        action: 'proactivity-suggestion',
        userSubscription: context.user.subscription,
        metadata: {
          type: `proactivity-${trigger.type}`,
        },
      });

      // Parse AI response into structured suggestion
      return this.parseAISuggestion(response.text, trigger);
    } catch (error) {
      this.logger.error('AI suggestion generation failed', error);
      return null;
    }
  }

  private buildSuggestionPrompt(trigger: TriggerEvent, context: UserContext): string {
    return `Analyze the following trigger and user context to generate a proactive suggestion:

Trigger Type: ${trigger.type}
Trigger Data: ${JSON.stringify(trigger.data, null, 2)}
User Context: ${context.summary}

Based on this information, suggest a specific, actionable recommendation that would help the user be more productive or stay on top of their work.

Respond in JSON format:
{
  "type": "TASK_CREATE|EMAIL_DRAFT|CALENDAR_BLOCK|MEETING_PREP|WORKFLOW_OPTIMIZE",
  "title": "Brief, clear title",
  "description": "Detailed description of what to do",
  "actionType": "specific_action_type",
  "actionData": {"key": "value"},
  "confidence": 0.85,
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "reasoning": "Why this suggestion makes sense",
  "expectedImpact": "What benefit this will provide"
}`;
  }

  private parseAISuggestion(aiResponse: string, trigger: TriggerEvent): EnhancedSuggestion | null {
    try {
      const parsed = JSON.parse(aiResponse);
      
      return {
        ...parsed,
        id: '', // Will be set when saved to database
        expiresAt: this.calculateExpirationTime(trigger.priority),
      };
    } catch (error) {
      this.logger.error('Failed to parse AI suggestion response', error);
      return null;
    }
  }

  private async prioritizeTrigger(trigger: TriggerEvent): Promise<'urgent' | 'important' | 'routine' | 'ignore'> {
    // Implement smart prioritization logic
    if (trigger.priority === 'urgent') return 'urgent';
    if (trigger.priority === 'important') return 'important';
    
    // Check user's recent activity and preferences
    const recentSuggestions = await this.prisma.aISuggestion.count({
      where: {
        userId: trigger.userId,
        suggestedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    // Don't overwhelm users with too many suggestions
    if (recentSuggestions > 3) return 'ignore';
    
    return trigger.priority;
  }

  private getProcessingDelay(priority: 'urgent' | 'important' | 'routine'): number {
    switch (priority) {
      case 'urgent': return 0; // Immediate
      case 'important': return 5 * 60 * 1000; // 5 minutes
      case 'routine': return 30 * 60 * 1000; // 30 minutes
      default: return 0;
    }
  }

  private getPriorityScore(priority: 'urgent' | 'important' | 'routine'): number {
    switch (priority) {
      case 'urgent': return 10;
      case 'important': return 5;
      case 'routine': return 1;
      default: return 1;
    }
  }


  private async detectPatterns(_context: UserContext): Promise<any[]> {
    // TODO: Implement pattern detection logic
    // This would analyze user behavior and identify opportunities for automation
    return [];
  }

  private canAutoExecute(suggestion: any): boolean {
    // Determine if a suggestion can be auto-executed without user approval
    const lowRiskActions = ['CALENDAR_BLOCK', 'MEETING_PREP'];
    return lowRiskActions.includes(suggestion.type) && suggestion.confidence > 0.9;
  }

  private async executeAction(suggestion: any): Promise<any> {
    // Execute the actual action based on suggestion type
    switch (suggestion.actionType) {
      case 'create_task':
        return this.createTask(suggestion);
      case 'draft_email':
        return this.draftEmail(suggestion);
      case 'block_calendar':
        return this.blockCalendar(suggestion);
      default:
        throw new Error(`Unknown action type: ${suggestion.actionType}`);
    }
  }

  private async createTask(_suggestion: any): Promise<any> {
    // TODO: Implementation for creating tasks
    return { message: 'Task creation not yet implemented' };
  }

  private async draftEmail(_suggestion: any): Promise<any> {
    // TODO: Implementation for drafting emails
    return { message: 'Email drafting not yet implemented' };
  }

  private async blockCalendar(_suggestion: any): Promise<any> {
    // TODO: Implementation for calendar blocking
    return { message: 'Calendar blocking not yet implemented' };
  }

  private calculateExpirationTime(priority: string): Date {
    let hours: number;
    
    if (priority === 'urgent') {
      hours = 2;
    } else if (priority === 'important') {
      hours = 24;
    } else {
      hours = 72;
    }
    
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private getProactivitySystemPrompt(): string {
    return `You are the proactivity engine for Aurelius, analyzing user patterns and triggers to generate helpful suggestions.

Your role:
- Analyze user context and triggers to identify opportunities for improvement
- Generate specific, actionable suggestions that save time and improve productivity
- Consider user preferences, workload, and patterns
- Prioritize suggestions based on impact and urgency

Guidelines:
- Be proactive but not overwhelming
- Focus on automation and efficiency gains
- Consider the user's subscription tier and capabilities
- Provide clear reasoning for each suggestion
- Ensure suggestions are actionable and specific

Remember: Quality over quantity - better to suggest one great action than multiple mediocre ones.`;
  }
}