import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../../ai-gateway/ai-gateway.service';
import { SearchService } from '../../search/search.service';
import { CacheService } from '../../cache/services/cache.service';
import { CalendarEvent, Task } from '@prisma/client';
import {
  WorkflowAnalysis,
  AnalysisContext,
  AnalysisInsight,
  InsightType,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
    private searchService: SearchService,
    private cacheService: CacheService,
  ) {}

  /**
   * Analyze workflow trigger and context
   */
  async analyzeWorkflow(
    userId: string,
    triggerId: string,
    triggerData: Record<string, any>,
  ): Promise<WorkflowAnalysis> {
    try {
      const startTime = Date.now();

      // Build analysis context
      const context = await this.buildAnalysisContext(userId, triggerData);

      // Get historical patterns
      const patterns = await this.analyzeHistoricalPatterns(userId, triggerId);

      // Perform AI analysis
      const aiInsights = await this.performAIAnalysis(context, patterns);

      // Detect anomalies
      const anomalies = await this.detectAnomalies(userId, context);

      // Identify optimization opportunities
      const optimizations = await this.identifyOptimizations(context);

      // Combine all insights
      const insights: AnalysisInsight[] = [
        ...aiInsights,
        ...anomalies,
        ...optimizations,
      ];

      // Calculate confidence score
      const confidence = this.calculateConfidence(insights, patterns);

      const analysis: WorkflowAnalysis = {
        id: `analysis-${Date.now()}`,
        workflowId: `workflow-${triggerId}`,
        triggerId,
        context,
        insights,
        suggestions: [], // Will be filled by SuggestionService
        confidence,
        timestamp: new Date(),
      };

      // Cache analysis results
      await this.cacheAnalysis(analysis);

      this.logger.log(
        `Completed workflow analysis in ${Date.now() - startTime}ms with ${insights.length} insights`,
      );

      return analysis;
    } catch (error: any) {
      this.logger.error(`Workflow analysis failed: ${error.message}`);
      throw new BusinessException(
        'Workflow analysis failed',
        'WORKFLOW_ANALYSIS_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Build comprehensive analysis context
   */
  private async buildAnalysisContext(
    userId: string,
    triggerData: Record<string, any>,
  ): Promise<AnalysisContext> {
    const [user, tasks, events, recentActivity] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
      }),
      this.prisma.task.count({
        where: { userId, status: { in: ['pending', 'in_progress'] } },
      }),
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
      }),
      this.getRecentActivity(userId),
    ]);

    const now = new Date();
    const context: AnalysisContext = {
      userId,
      triggerData,
      userContext: {
        currentTasks: tasks,
        upcomingEvents: events,
        recentActivity,
        preferences: (user?.preferences as Record<string, any>) || {},
      },
      environmentContext: {
        timeOfDay: this.getTimeOfDay(now),
        dayOfWeek: this.getDayOfWeek(now),
        location: triggerData.location,
        device: triggerData.device,
      },
    };

    return context;
  }

  /**
   * Analyze historical patterns
   */
  private async analyzeHistoricalPatterns(
    userId: string,
    triggerId: string,
  ): Promise<any> {
    // Get historical workflow executions
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        userId,
        workflowId: triggerId, // assuming triggerId is actually workflowId
        startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    // Analyze patterns
    const patterns = {
      executionFrequency: this.calculateFrequency(executions),
      successRate: this.calculateSuccessRate(executions),
      commonActions: this.findCommonActions(executions),
      peakTimes: this.findPeakTimes(executions),
      averageDuration: this.calculateAverageDuration(executions),
    };

    return patterns;
  }

  /**
   * Perform AI-powered analysis
   */
  private async performAIAnalysis(
    context: AnalysisContext,
    patterns: any,
  ): Promise<AnalysisInsight[]> {
    const insights: AnalysisInsight[] = [];

    try {
      // Prepare context for AI
      const aiContext = {
        userWorkload: context.userContext.currentTasks,
        upcomingCommitments: context.userContext.upcomingEvents,
        timeContext: context.environmentContext,
        historicalPatterns: patterns,
        triggerData: context.triggerData,
      };

      // Get AI insights
      const user = await this.prisma.user.findUnique({
        where: { id: context.userId },
        include: { subscription: true },
      });
      
      if (!user || !user.subscription) {
        throw new Error('User or subscription not found');
      }

      const aiResponse = await this.aiGateway.processRequest({
        prompt: this.buildAIPrompt(aiContext),
        userId: context.userId,
        action: 'workflow-analysis',
        userSubscription: { tier: user.subscription.tier },
        metadata: { type: 'analysis' },
      });

      // Parse AI insights
      const parsedInsights = this.parseAIInsights(aiResponse.text);
      insights.push(...parsedInsights);

      // Search for similar past scenarios
      const similarScenarios = await this.searchService.findSimilar(
        context.userId,
        JSON.stringify(context.triggerData),
        5,
      );

      if (similarScenarios.length > 0) {
        insights.push({
          type: InsightType.PATTERN_DETECTED,
          title: 'Similar Past Scenarios',
          description: `Found ${similarScenarios.length} similar past scenarios that might inform current decisions`,
          data: { scenarios: similarScenarios },
          importance: 'medium',
        });
      }
    } catch (error) {
      this.logger.warn(`AI analysis failed: ${error}`);
    }

    return insights;
  }

  /**
   * Detect anomalies in the workflow context
   */
  private async detectAnomalies(
    userId: string,
    context: AnalysisContext,
  ): Promise<AnalysisInsight[]> {
    const insights: AnalysisInsight[] = [];

    // Check for unusual workload
    if (context.userContext.currentTasks > 20) {
      insights.push({
        type: InsightType.ANOMALY_DETECTED,
        title: 'High Task Load',
        description: 'Current task count is significantly higher than usual',
        data: { currentTasks: context.userContext.currentTasks },
        importance: 'high',
      });
    }

    // Check for scheduling conflicts
    const conflicts = await this.checkSchedulingConflicts(userId);
    if (conflicts.length > 0) {
      insights.push({
        type: InsightType.RISK_IDENTIFIED,
        title: 'Scheduling Conflicts Detected',
        description: `Found ${conflicts.length} potential scheduling conflicts`,
        data: { conflicts },
        importance: 'critical',
      });
    }

    // Check for overdue tasks
    const overdueTasks = await this.prisma.task.count({
      where: {
        userId,
        dueDate: { lt: new Date() },
        status: { notIn: ['completed', 'cancelled'] },
      },
    });

    if (overdueTasks > 0) {
      insights.push({
        type: InsightType.RISK_IDENTIFIED,
        title: 'Overdue Tasks',
        description: `You have ${overdueTasks} overdue tasks requiring attention`,
        data: { overdueCount: overdueTasks },
        importance: 'high',
      });
    }

    return insights;
  }

  /**
   * Identify optimization opportunities
   */
  private async identifyOptimizations(
    context: AnalysisContext,
  ): Promise<AnalysisInsight[]> {
    const insights: AnalysisInsight[] = [];

    // Task batching opportunity
    if (context.userContext.currentTasks > 5) {
      const similarTasks = await this.findSimilarTasks(context.userId);
      if (similarTasks.length > 2) {
        insights.push({
          type: InsightType.OPTIMIZATION_OPPORTUNITY,
          title: 'Task Batching Opportunity',
          description: 'Similar tasks can be batched for efficiency',
          data: { tasks: similarTasks },
          importance: 'medium',
        });
      }
    }

    // Meeting optimization
    if (context.userContext.upcomingEvents > 3) {
      insights.push({
        type: InsightType.OPTIMIZATION_OPPORTUNITY,
        title: 'Meeting Schedule Optimization',
        description: 'Consider consolidating or rescheduling meetings for better focus time',
        data: { eventCount: context.userContext.upcomingEvents },
        importance: 'medium',
      });
    }

    // Time-based optimization
    if (context.environmentContext.timeOfDay === 'evening') {
      insights.push({
        type: InsightType.RECOMMENDATION,
        title: 'End-of-Day Planning',
        description: 'Good time to plan tomorrow\'s priorities',
        data: { timeContext: context.environmentContext },
        importance: 'low',
      });
    }

    return insights;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    insights: AnalysisInsight[],
    patterns: any,
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on historical data
    if (patterns.executionFrequency > 10) {
      confidence += 0.1;
    }
    if (patterns.successRate > 0.8) {
      confidence += 0.1;
    }

    // Adjust based on insights
    const criticalInsights = insights.filter(i => i.importance === 'critical').length;
    const highInsights = insights.filter(i => i.importance === 'high').length;

    confidence += (insights.length * 0.02); // More insights = higher confidence
    confidence -= (criticalInsights * 0.05); // Critical issues reduce confidence
    confidence += (highInsights * 0.03); // High importance insights boost confidence

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Helper methods
   */
  private async getRecentActivity(userId: string): Promise<any[]> {
    const activities = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    return activities;
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  private calculateFrequency(executions: any[]): number {
    if (executions.length < 2) return 0;
    const daysDiff = (new Date().getTime() - executions[executions.length - 1].createdAt.getTime()) 
      / (1000 * 60 * 60 * 24);
    return executions.length / daysDiff;
  }

  private calculateSuccessRate(executions: any[]): number {
    if (executions.length === 0) return 0;
    const successful = executions.filter(e => e.status === 'completed').length;
    return successful / executions.length;
  }

  private findCommonActions(executions: any[]): string[] {
    const actionCounts: Record<string, number> = {};
    
    executions.forEach(exec => {
      (exec.executedActions || []).forEach((action: any) => {
        actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
      });
    });

    return Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action]) => action);
  }

  private findPeakTimes(executions: any[]): number[] {
    const hourCounts: number[] = new Array(24).fill(0);
    
    executions.forEach(exec => {
      const hour = exec.createdAt.getHours();
      hourCounts[hour]++;
    });

    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  private calculateAverageDuration(executions: any[]): number {
    const durations = executions
      .filter(e => e.completedAt && e.startedAt)
      .map(e => e.completedAt.getTime() - e.startedAt.getTime());
    
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  private buildAIPrompt(context: any): string {
    return `Analyze this workflow context and provide insights:
    
User Workload: ${context.userWorkload} active tasks
Upcoming Events: ${context.upcomingCommitments} in next 7 days
Time: ${context.timeContext.timeOfDay} on ${context.timeContext.dayOfWeek}
Historical Success Rate: ${context.historicalPatterns.successRate}

Trigger Data: ${JSON.stringify(context.triggerData)}

Provide 3-5 specific, actionable insights about:
1. Current workload and capacity
2. Potential risks or conflicts
3. Optimization opportunities
4. Recommended actions

Format as JSON array with: type, title, description, importance`;
  }

  private parseAIInsights(content: string): AnalysisInsight[] {
    try {
      // Extract JSON from AI response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const insights = JSON.parse(jsonMatch[0]);
      return insights.map((insight: any) => ({
        type: this.mapToInsightType(insight.type),
        title: insight.title,
        description: insight.description,
        data: insight.data || {},
        importance: insight.importance || 'medium',
      }));
    } catch (error) {
      this.logger.warn(`Failed to parse AI insights: ${error}`);
      return [];
    }
  }

  private mapToInsightType(type: string): InsightType {
    const typeMap: Record<string, InsightType> = {
      pattern: InsightType.PATTERN_DETECTED,
      anomaly: InsightType.ANOMALY_DETECTED,
      optimization: InsightType.OPTIMIZATION_OPPORTUNITY,
      risk: InsightType.RISK_IDENTIFIED,
      recommendation: InsightType.RECOMMENDATION,
    };
    return typeMap[type.toLowerCase()] || InsightType.RECOMMENDATION;
  }

  private async checkSchedulingConflicts(userId: string): Promise<CalendarEvent[]> {
    // Check for overlapping events in the next 7 days
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    });
    
    return events;
  }

  private async findSimilarTasks(userId: string): Promise<Task[]> {
    // Find recently created tasks for pattern analysis
    const recentTasks = await this.prisma.task.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return recentTasks;
  }

  private async cacheAnalysis(analysis: WorkflowAnalysis): Promise<void> {
    const key = `analysis:${analysis.id}`;
    await this.cacheService.set(key, analysis, 3600); // 1 hour
  }
}