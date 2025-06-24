import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../../ai-gateway/ai-gateway.service';
import { CacheService } from '../../cache/services/cache.service';
import {
  WorkflowAnalysis,
  WorkflowSuggestion,
  SuggestionType,
  WorkflowAction,
  ActionType,
  ActionParameters,
  ActionRequirement,
  ActionEffect,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
    private cacheService: CacheService
  ) {}

  /**
   * Generate suggestions based on analysis
   */
  async generateSuggestions(analysis: WorkflowAnalysis): Promise<WorkflowSuggestion[]> {
    try {
      const suggestions: WorkflowSuggestion[] = [];

      // Generate task-based suggestions
      const taskSuggestions = await this.generateTaskSuggestions(analysis);
      suggestions.push(...taskSuggestions);

      // Generate scheduling suggestions
      const scheduleSuggestions = await this.generateScheduleSuggestions(analysis);
      suggestions.push(...scheduleSuggestions);

      // Generate automation suggestions
      const automationSuggestions = await this.generateAutomationSuggestions(analysis);
      suggestions.push(...automationSuggestions);

      // Generate AI-powered suggestions
      const aiSuggestions = await this.generateAISuggestions(analysis);
      suggestions.push(...aiSuggestions);

      // Prioritize and filter suggestions
      const finalSuggestions = this.prioritizeSuggestions(suggestions, analysis);

      // Cache suggestions
      await this.cacheSuggestions(analysis.id, finalSuggestions);

      this.logger.log(
        `Generated ${finalSuggestions.length} suggestions for analysis ${analysis.id}`
      );
      return finalSuggestions;
    } catch (error: any) {
      this.logger.error(`Failed to generate suggestions: ${error.message}`);
      throw new BusinessException(
        'Failed to generate suggestions',
        'SUGGESTION_GENERATION_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Generate task-related suggestions
   */
  private async generateTaskSuggestions(analysis: WorkflowAnalysis): Promise<WorkflowSuggestion[]> {
    const suggestions: WorkflowSuggestion[] = [];
    const context = analysis.context;

    // Check for high workload
    if (context.userContext.currentTasks > 10) {
      suggestions.push({
        id: `sug-${Date.now()}-delegate`,
        type: SuggestionType.DELEGATE_TASK,
        title: 'Delegate Low-Priority Tasks',
        description: 'Your task load is high. Consider delegating or deferring low-priority items.',
        actions: [
          this.createAction(ActionType.UPDATE_TASK, 'Mark tasks for delegation', {
            required: {
              taskIds: {
                type: 'array',
                description: 'Tasks to delegate',
              },
              delegateTo: {
                type: 'string',
                description: 'Person or team to delegate to',
              },
            },
          }),
        ],
        priority: 8,
        estimatedImpact: {
          timeSaved: 120, // minutes
          effortReduced: 30, // percentage
        },
        reasoning: 'Delegating tasks will free up time for high-priority work',
        confidence: 0.85,
      });
    }

    // Check for similar tasks
    const hasPattern = analysis.insights.find(
      i => i.type === 'pattern_detected' && i.data.similarTasks
    );

    if (hasPattern) {
      suggestions.push({
        id: `sug-${Date.now()}-merge`,
        type: SuggestionType.MERGE_TASKS,
        title: 'Merge Similar Tasks',
        description: 'Several tasks have similar objectives and can be combined.',
        actions: [
          this.createAction(ActionType.UPDATE_TASK, 'Merge related tasks', {
            required: {
              taskIds: {
                type: 'array',
                description: 'Tasks to merge',
              },
              mergedTitle: {
                type: 'string',
                description: 'Title for merged task',
              },
            },
          }),
        ],
        priority: 6,
        estimatedImpact: {
          timeSaved: 60,
          effortReduced: 20,
        },
        reasoning: 'Combining similar tasks reduces context switching',
        confidence: 0.75,
      });
    }

    return suggestions;
  }

  /**
   * Generate scheduling suggestions
   */
  private async generateScheduleSuggestions(
    analysis: WorkflowAnalysis
  ): Promise<WorkflowSuggestion[]> {
    const suggestions: WorkflowSuggestion[] = [];
    const context = analysis.context;

    // Suggest optimal task scheduling
    if (context.environmentContext.timeOfDay === 'morning') {
      suggestions.push({
        id: `sug-${Date.now()}-schedule`,
        type: SuggestionType.SCHEDULE_TASK,
        title: 'Schedule Deep Work Session',
        description: 'Morning hours are optimal for focused work. Block time for important tasks.',
        actions: [
          this.createAction(ActionType.SCHEDULE_EVENT, 'Create focus time block', {
            required: {
              title: {
                type: 'string',
                description: 'Session title',
                default: 'Deep Work Session',
              },
              duration: {
                type: 'number',
                description: 'Duration in minutes',
                default: 90,
              },
              startTime: {
                type: 'date',
                description: 'Start time',
              },
            },
          }),
        ],
        priority: 7,
        estimatedImpact: {
          effortReduced: 25,
        },
        reasoning: 'Morning focus sessions are 40% more productive',
        confidence: 0.8,
      });
    }

    // Check for meeting overload
    if (context.userContext.upcomingEvents > 5) {
      suggestions.push({
        id: `sug-${Date.now()}-optimize-meetings`,
        type: SuggestionType.OPTIMIZE_WORKFLOW,
        title: 'Optimize Meeting Schedule',
        description:
          'High meeting density detected. Consider consolidating or declining non-essential meetings.',
        actions: [
          this.createAction(ActionType.ANALYZE_DATA, 'Analyze meeting necessity', {
            required: {
              eventIds: {
                type: 'array',
                description: 'Meeting IDs to analyze',
              },
            },
          }),
        ],
        priority: 6,
        estimatedImpact: {
          timeSaved: 180,
        },
        reasoning: 'Reducing meetings by 20% can save 3+ hours per week',
        confidence: 0.7,
      });
    }

    return suggestions;
  }

  /**
   * Generate automation suggestions
   */
  private async generateAutomationSuggestions(
    analysis: WorkflowAnalysis
  ): Promise<WorkflowSuggestion[]> {
    const suggestions: WorkflowSuggestion[] = [];

    // Check for repetitive patterns
    const patterns = analysis.insights.filter(i => i.type === 'pattern_detected');

    for (const pattern of patterns) {
      if (pattern.data.frequency > 3) {
        suggestions.push({
          id: `sug-${Date.now()}-automate-${pattern.data.type}`,
          type: SuggestionType.AUTOMATE_TASK,
          title: `Automate ${pattern.title}`,
          description: `This action occurs frequently and can be automated to save time.`,
          actions: [
            this.createAction(ActionType.TRIGGER_WORKFLOW, 'Create automation workflow', {
              required: {
                workflowType: {
                  type: 'string',
                  description: 'Type of automation',
                  default: pattern.data.type,
                },
                trigger: {
                  type: 'object',
                  description: 'Trigger configuration',
                },
              },
            }),
          ],
          priority: 9,
          estimatedImpact: {
            timeSaved: pattern.data.frequency * 15, // 15 min per occurrence
            effortReduced: 40,
          },
          reasoning: `Automating this would save ~${pattern.data.frequency * 15} minutes per week`,
          confidence: 0.9,
        });
      }
    }

    // Email automation suggestions
    if (analysis.context.triggerData.type === 'email_received') {
      suggestions.push({
        id: `sug-${Date.now()}-email-template`,
        type: SuggestionType.SUGGEST_TEMPLATE,
        title: 'Create Email Response Template',
        description: 'Similar emails detected. Create a template for faster responses.',
        actions: [
          this.createAction(ActionType.GENERATE_CONTENT, 'Generate email template', {
            required: {
              emailType: {
                type: 'string',
                description: 'Type of email',
              },
              templateName: {
                type: 'string',
                description: 'Template name',
              },
            },
          }),
        ],
        priority: 5,
        estimatedImpact: {
          timeSaved: 30,
        },
        reasoning: 'Templates can reduce email response time by 70%',
        confidence: 0.65,
      });
    }

    return suggestions;
  }

  /**
   * Generate AI-powered suggestions
   */
  private async generateAISuggestions(analysis: WorkflowAnalysis): Promise<WorkflowSuggestion[]> {
    try {
      const prompt = this.buildSuggestionPrompt(analysis);

      // Get user subscription info
      const user = await this.prisma.user.findUnique({
        where: { id: analysis.context.userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription) {
        this.logger.warn(
          `User or subscription not found for AI suggestions: ${analysis.context.userId}`
        );
        return [];
      }

      const response = await this.aiGateway.processRequest({
        prompt,
        userId: analysis.context.userId,
        action: 'workflow-suggestions',
        userSubscription: { tier: user.subscription.tier },
        metadata: { type: 'suggestions' },
      });

      return this.parseAISuggestions(response.text, analysis);
    } catch (error) {
      this.logger.warn(`AI suggestion generation failed: ${error}`);
      return [];
    }
  }

  /**
   * Prioritize and filter suggestions
   */
  private prioritizeSuggestions(
    suggestions: WorkflowSuggestion[],
    analysis: WorkflowAnalysis
  ): WorkflowSuggestion[] {
    // Sort by priority and confidence
    const sorted = suggestions.sort((a, b) => {
      const scoreA = a.priority * a.confidence;
      const scoreB = b.priority * b.confidence;
      return scoreB - scoreA;
    });

    // Filter based on context
    const filtered = sorted.filter(suggestion => {
      // Remove low-confidence suggestions unless they're critical
      if (suggestion.confidence < 0.5 && suggestion.priority < 8) {
        return false;
      }

      // Check if suggestion is relevant to current context
      if (!this.isSuggestionRelevant(suggestion, analysis)) {
        return false;
      }

      return true;
    });

    // Return top suggestions
    return filtered.slice(0, 5);
  }

  /**
   * Helper methods
   */
  private createAction(
    type: ActionType,
    name: string,
    parameters: ActionParameters
  ): WorkflowAction {
    return {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      description: `Action to ${name.toLowerCase()}`,
      parameters,
      requires: this.getActionRequirements(type),
      effects: this.getActionEffects(type),
      reversible: this.isActionReversible(type),
    };
  }

  private getActionRequirements(type: ActionType): ActionRequirement[] {
    const requirementsMap: Record<ActionType, ActionRequirement[]> = {
      [ActionType.CREATE_TASK]: [],
      [ActionType.UPDATE_TASK]: [{ type: 'permission', details: { scope: 'task.write' } }],
      [ActionType.SEND_EMAIL]: [
        { type: 'integration', details: { service: 'email' } },
        { type: 'confirmation', details: { reason: 'Sending email on your behalf' } },
      ],
      [ActionType.SCHEDULE_EVENT]: [{ type: 'integration', details: { service: 'calendar' } }],
      [ActionType.CREATE_REMINDER]: [],
      [ActionType.EXECUTE_INTEGRATION]: [{ type: 'integration', details: { service: 'varies' } }],
      [ActionType.TRIGGER_WORKFLOW]: [
        { type: 'permission', details: { scope: 'workflow.execute' } },
      ],
      [ActionType.GENERATE_CONTENT]: [{ type: 'permission', details: { scope: 'ai.generate' } }],
      [ActionType.ANALYZE_DATA]: [{ type: 'data', details: { required: 'historical_data' } }],
      [ActionType.NOTIFY_USER]: [],
    };

    return requirementsMap[type] || [];
  }

  private getActionEffects(type: ActionType): ActionEffect[] {
    const effectsMap: Record<ActionType, ActionEffect[]> = {
      [ActionType.CREATE_TASK]: [
        { type: 'creates', target: 'task', description: 'Creates a new task' },
      ],
      [ActionType.UPDATE_TASK]: [
        { type: 'updates', target: 'task', description: 'Updates task properties' },
      ],
      [ActionType.SEND_EMAIL]: [
        { type: 'creates', target: 'email', description: 'Sends an email' },
        { type: 'notifies', target: 'recipient', description: 'Notifies email recipient' },
      ],
      [ActionType.SCHEDULE_EVENT]: [
        { type: 'creates', target: 'calendar_event', description: 'Creates calendar event' },
      ],
      [ActionType.CREATE_REMINDER]: [
        { type: 'creates', target: 'reminder', description: 'Creates a reminder' },
      ],
      [ActionType.EXECUTE_INTEGRATION]: [
        { type: 'updates', target: 'external_system', description: 'Updates external system' },
      ],
      [ActionType.TRIGGER_WORKFLOW]: [
        { type: 'creates', target: 'workflow_execution', description: 'Starts workflow' },
      ],
      [ActionType.GENERATE_CONTENT]: [
        { type: 'creates', target: 'content', description: 'Generates new content' },
      ],
      [ActionType.ANALYZE_DATA]: [
        { type: 'creates', target: 'analysis', description: 'Creates analysis report' },
      ],
      [ActionType.NOTIFY_USER]: [
        { type: 'notifies', target: 'user', description: 'Sends notification' },
      ],
    };

    return effectsMap[type] || [];
  }

  private isActionReversible(type: ActionType): boolean {
    const reversibleActions = [ActionType.UPDATE_TASK, ActionType.CREATE_REMINDER];
    return reversibleActions.includes(type);
  }

  private isSuggestionRelevant(
    suggestion: WorkflowSuggestion,
    analysis: WorkflowAnalysis
  ): boolean {
    // Check if suggestion type matches context
    const context = analysis.context;

    switch (suggestion.type) {
      case SuggestionType.DELEGATE_TASK:
        return context.userContext.currentTasks > 5;
      case SuggestionType.SCHEDULE_TASK:
        return context.userContext.upcomingEvents < 10;
      case SuggestionType.AUTOMATE_TASK:
        return analysis.insights.some(i => i.type === 'pattern_detected');
      default:
        return true;
    }
  }

  private buildSuggestionPrompt(analysis: WorkflowAnalysis): string {
    return `Based on this workflow analysis, suggest actionable improvements:

Context:
- User has ${analysis.context.userContext.currentTasks} active tasks
- ${analysis.context.userContext.upcomingEvents} upcoming events
- Time: ${analysis.context.environmentContext.timeOfDay}
- Trigger: ${JSON.stringify(analysis.context.triggerData)}

Insights:
${analysis.insights.map(i => `- ${i.title}: ${i.description}`).join('\n')}

Generate 2-3 specific, actionable suggestions that would:
1. Save time or reduce effort
2. Prevent potential issues
3. Optimize workflow efficiency

Format as JSON array with: type, title, description, priority (1-10), estimatedTimeSaved, reasoning`;
  }

  private parseAISuggestions(content: string, analysis: WorkflowAnalysis): WorkflowSuggestion[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions.map(
        (sugData: {
          type?: string;
          title?: string;
          description?: string;
          priority?: number;
          estimatedTimeSaved?: number;
          reasoning?: string;
        }) => ({
          id: `sug-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: this.mapToSuggestionType(sugData.type || 'general'),
          title: sugData.title || 'AI Generated Suggestion',
          description: sugData.description || 'Generated based on workflow analysis',
          actions: this.generateActionsForSuggestion(sugData, analysis),
          priority: sugData.priority || 5,
          estimatedImpact: {
            timeSaved: sugData.estimatedTimeSaved || 0,
          },
          reasoning: sugData.reasoning || 'AI-generated suggestion based on current context',
          confidence: 0.7,
        })
      );
    } catch (error) {
      this.logger.warn(`Failed to parse AI suggestions: ${error}`);
      return [];
    }
  }

  private generateActionsForSuggestion(
    sugData: { type?: string; title?: string; description?: string },
    analysis: WorkflowAnalysis
  ): WorkflowAction[] {
    // Generate appropriate actions based on suggestion type and analysis context
    const actions: WorkflowAction[] = [];
    const suggestionType = sugData.type || 'general';

    switch (suggestionType.toLowerCase()) {
      case 'task':
        actions.push(
          this.createAction(ActionType.CREATE_TASK, 'Create suggested task', {
            required: {
              title: {
                type: 'string',
                description: 'Task title',
                default: sugData.title || 'AI Suggested Task',
              },
              description: {
                type: 'string',
                description: 'Task description',
                default: sugData.description || 'Generated from workflow analysis',
              },
            },
          })
        );
        break;
      case 'email':
        actions.push(
          this.createAction(ActionType.SEND_EMAIL, 'Send suggested email', {
            required: {
              to: {
                type: 'string',
                description: 'Email recipient',
                default: analysis.context.triggerData.email || '',
              },
              subject: {
                type: 'string',
                description: 'Email subject',
                default: sugData.title || 'Follow-up',
              },
            },
          })
        );
        break;
      case 'notification':
        actions.push(
          this.createAction(ActionType.NOTIFY_USER, 'Send notification', {
            required: {
              title: {
                type: 'string',
                description: 'Notification title',
                default: sugData.title || 'Workflow Update',
              },
              message: {
                type: 'string',
                description: 'Notification message',
                default: sugData.description || 'Automated workflow notification',
              },
            },
          })
        );
        break;
      default:
        // For general suggestions, create a generic action
        actions.push(
          this.createAction(ActionType.NOTIFY_USER, 'Execute suggestion', {
            required: {
              title: {
                type: 'string',
                description: 'Action title',
                default: sugData.title || 'Execute AI Suggestion',
              },
              message: {
                type: 'string',
                description: 'Action description',
                default: sugData.description || 'Execute the AI-generated suggestion',
              },
            },
          })
        );
    }

    return actions;
  }

  private mapToSuggestionType(type: string): SuggestionType {
    const typeMap: Record<string, SuggestionType> = {
      automate: SuggestionType.AUTOMATE_TASK,
      delegate: SuggestionType.DELEGATE_TASK,
      schedule: SuggestionType.SCHEDULE_TASK,
      merge: SuggestionType.MERGE_TASKS,
      prioritize: SuggestionType.PRIORITIZE_TASK,
      remind: SuggestionType.CREATE_REMINDER,
      template: SuggestionType.SUGGEST_TEMPLATE,
      optimize: SuggestionType.OPTIMIZE_WORKFLOW,
    };
    return typeMap[type.toLowerCase()] || SuggestionType.OPTIMIZE_WORKFLOW;
  }

  private async cacheSuggestions(
    analysisId: string,
    suggestions: WorkflowSuggestion[]
  ): Promise<void> {
    const key = `suggestions:${analysisId}`;
    await this.cacheService.set(key, suggestions, 3600); // 1 hour
  }
}
