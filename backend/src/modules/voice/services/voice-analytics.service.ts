import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { BusinessException } from '../../../common/exceptions/business.exception';

interface VoiceMetrics {
  totalInteractions: number;
  averageResponseTime: number;
  averageConfidence: number;
  intentDistribution: Record<string, number>;
  peakUsageHours: number[];
  languageDistribution: Record<string, number>;
  errorRate: number;
  userSatisfactionScore: number;
}

interface VoiceInsights {
  mostCommonQueries: Array<{ query: string; count: number }>;
  improvementAreas: string[];
  userPreferences: {
    preferredVoice: string;
    averageQueryLength: number;
    preferredLanguage: string;
  };
  performanceTrends: {
    responseTimeImprovement: number;
    confidenceImprovement: number;
    errorRateChange: number;
  };
}

interface VoiceInteractionData {
  id: string;
  userId: string;
  type: string;
  provider: string;
  inputText: string | null;
  outputText: string | null;
  audioFileUrl: string | null;
  duration: number | null;
  language: string;
  voiceId: string | null;
  speed: number;
  pitch: number;
  cost: Prisma.Decimal | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  // Additional computed fields for analytics
  confidence?: number;
  intent?: string;
  error?: string;
  transcript?: string;
}

interface TrackingInteractionData {
  transcript: string;
  intent: string;
  confidence: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

interface VoiceUsageReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: VoiceMetrics & {
    averagePerDay: number;
  };
  dailyUsage: Record<string, number>;
  hourlyDistribution: number[];
  topQueries: Array<{ query: string; count: number }>;
}

interface PerformanceTrends {
  responseTimeImprovement: number;
  confidenceImprovement: number;
  errorRateChange: number;
}

interface CommandPattern {
  pattern: string;
  frequency: number;
  examples: string[];
}

@Injectable()
export class VoiceAnalyticsService {
  private readonly logger = new Logger(VoiceAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Get voice usage metrics
   */
  async getVoiceMetrics(
    userId: string,
    timeRange: 'day' | 'week' | 'month' = 'week'
  ): Promise<VoiceMetrics> {
    const cacheKey = `voice:metrics:${userId}:${timeRange}`;

    const cached = await this.cacheService.get<VoiceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = this.getStartDate(timeRange);

    try {
      const interactions = (await this.prisma.voiceInteraction.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
      })) as unknown as VoiceInteractionData[];

      const metrics = this.calculateMetrics(interactions);

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, metrics, 3600);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get voice metrics', error);
      throw new BusinessException(
        'Failed to retrieve voice metrics',
        'VOICE_METRICS_FETCH_FAILED',
        500
      );
    }
  }

  /**
   * Get voice insights
   */
  async getVoiceInsights(userId: string, limit: number = 10): Promise<VoiceInsights> {
    try {
      const interactions = (await this.prisma.voiceInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100, // Last 100 interactions for analysis
      })) as unknown as VoiceInteractionData[];

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { voiceId: true, voiceLanguage: true },
      });

      // Analyze common queries
      const queryFrequency = new Map<string, number>();
      interactions.forEach(interaction => {
        const normalized = this.normalizeQuery(interaction.inputText || '');
        queryFrequency.set(normalized, (queryFrequency.get(normalized) || 0) + 1);
      });

      const mostCommonQueries = Array.from(queryFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));

      // Calculate improvements
      const improvementAreas = this.identifyImprovementAreas(interactions);

      // User preferences
      const userPreferences = {
        preferredVoice: user?.voiceId || 'default',
        averageQueryLength: this.calculateAverageLength(interactions),
        preferredLanguage: user?.voiceLanguage || 'en-US',
      };

      // Performance trends
      const performanceTrends = await this.calculatePerformanceTrends(userId);

      return {
        mostCommonQueries,
        improvementAreas,
        userPreferences,
        performanceTrends,
      };
    } catch (error) {
      this.logger.error('Failed to get voice insights', error);
      throw new BusinessException(
        'Failed to retrieve voice insights',
        'VOICE_INSIGHTS_FETCH_FAILED',
        500
      );
    }
  }

  /**
   * Track voice interaction
   */
  async trackInteraction(userId: string, interaction: TrackingInteractionData): Promise<void> {
    try {
      // Emit event for real-time analytics
      this.eventEmitter.emit('voice.interaction.tracked', {
        userId,
        ...interaction,
        timestamp: new Date(),
      });

      // Update user voice stats
      await this.updateUserVoiceStats(userId, interaction);

      // Check for anomalies
      if (interaction.confidence < 0.5 || !interaction.success) {
        await this.handleLowConfidenceInteraction(userId, interaction);
      }
    } catch (error) {
      this.logger.error('Failed to track voice interaction', error);
      // Don't re-throw here as tracking failures shouldn't break the main flow
    }
  }

  /**
   * Get voice command patterns
   */
  async getCommandPatterns(userId: string, days: number = 7): Promise<CommandPattern[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const interactions = await this.prisma.voiceInteraction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        inputText: true,
        metadata: true,
      },
    });

    // Group by intent and analyze patterns
    const patternsByIntent = new Map<string, string[]>();
    interactions.forEach(({ inputText, metadata }) => {
      const intent =
        typeof metadata === 'object' && metadata !== null
          ? (metadata as Record<string, string>).intent
          : null;
      if (!intent || !inputText) return;
      if (!patternsByIntent.has(intent)) {
        patternsByIntent.set(intent, []);
      }
      patternsByIntent.get(intent)?.push(inputText);
    });

    const patterns: CommandPattern[] = [];

    patternsByIntent.forEach((transcripts, intent) => {
      const commonPhrases = this.extractCommonPhrases(transcripts);
      patterns.push({
        pattern: intent,
        frequency: transcripts.length,
        examples: commonPhrases.slice(0, 3),
      });
    });

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate voice usage report
   */
  async generateUsageReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VoiceUsageReport> {
    const interactions = (await this.prisma.voiceInteraction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })) as unknown as VoiceInteractionData[];

    const dailyUsage = this.groupByDay(interactions);
    const hourlyDistribution = this.calculateHourlyDistribution(interactions);
    const metrics = this.calculateMetrics(interactions);
    const topQueries = await this.getTopQueries(userId, startDate, endDate);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        ...metrics,
        averagePerDay: interactions.length / this.daysBetween(startDate, endDate),
      },
      dailyUsage,
      hourlyDistribution,
      topQueries,
    };
  }

  /**
   * Private helper methods
   */
  private calculateMetrics(interactions: VoiceInteractionData[]): VoiceMetrics {
    if (interactions.length === 0) {
      return {
        totalInteractions: 0,
        averageResponseTime: 0,
        averageConfidence: 0,
        intentDistribution: {},
        peakUsageHours: [],
        languageDistribution: {},
        errorRate: 0,
        userSatisfactionScore: 0,
      };
    }

    // Calculate averages
    const totalResponseTime = interactions.reduce((sum, i) => sum + (Number(i.duration) || 0), 0);
    const totalConfidence = interactions.reduce((sum, i) => sum + (i.confidence || 0), 0);
    const errorCount = interactions.filter(i => i.error || i.type === 'error').length;

    // Intent distribution
    const intentCounts = new Map<string, number>();
    interactions.forEach(i => {
      const intent =
        i.intent ||
        (typeof i.metadata === 'object' &&
        i.metadata !== null &&
        typeof (i.metadata as Record<string, unknown>).intent === 'string'
          ? ((i.metadata as Record<string, unknown>).intent as string)
          : null);
      if (intent) {
        intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);
      }
    });

    // Language distribution
    const languageCounts = new Map<string, number>();
    interactions.forEach(i => {
      const lang = i.language || 'en';
      languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
    });

    // Peak usage hours
    const hourCounts = new Array(24).fill(0);
    interactions.forEach(i => {
      const hour = new Date(i.createdAt).getHours();
      hourCounts[hour]++;
    });
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    // Calculate satisfaction (based on confidence and success rate)
    const successRate = 1 - errorCount / interactions.length;
    const avgConfidence = totalConfidence / interactions.length;
    const satisfactionScore = (successRate * 0.7 + avgConfidence * 0.3) * 100;

    return {
      totalInteractions: interactions.length,
      averageResponseTime: totalResponseTime / interactions.length,
      averageConfidence: avgConfidence,
      intentDistribution: Object.fromEntries(intentCounts),
      peakUsageHours: peakHours,
      languageDistribution: Object.fromEntries(languageCounts),
      errorRate: errorCount / interactions.length,
      userSatisfactionScore: Math.round(satisfactionScore),
    };
  }

  private identifyImprovementAreas(interactions: VoiceInteractionData[]): string[] {
    const areas: string[] = [];

    // Check confidence levels
    const confidenceValues = interactions
      .map(
        i =>
          i.confidence ||
          (typeof i.metadata === 'object' &&
          i.metadata !== null &&
          typeof (i.metadata as Record<string, unknown>).confidence === 'number'
            ? ((i.metadata as Record<string, unknown>).confidence as number)
            : null)
      )
      .filter(c => c !== null) as number[];

    const lowConfidenceCount = confidenceValues.filter(c => c < 0.7).length;
    if (lowConfidenceCount > confidenceValues.length * 0.2) {
      areas.push('Consider speaking more clearly or adjusting microphone settings');
    }

    // Check response times
    const slowResponses = interactions.filter(i => Number(i.duration) > 5000).length;
    if (slowResponses > interactions.length * 0.1) {
      areas.push('Some queries are taking longer to process');
    }

    // Check error rate
    const errors = interactions.filter(i => i.error || i.type === 'error').length;
    if (errors > interactions.length * 0.05) {
      areas.push('Reduce errors by checking network connection and audio quality');
    }

    // Check query length
    const avgLength = this.calculateAverageLength(interactions);
    if (avgLength > 100) {
      areas.push('Try breaking down complex queries into simpler requests');
    }

    return areas;
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateAverageLength(interactions: VoiceInteractionData[]): number {
    if (interactions.length === 0) return 0;
    const totalLength = interactions.reduce((sum, i) => {
      const text = i.transcript || i.inputText || i.outputText || '';
      return sum + text.length;
    }, 0);
    return Math.round(totalLength / interactions.length);
  }

  private async calculatePerformanceTrends(userId: string): Promise<PerformanceTrends> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentWeek, previousWeek] = await Promise.all([
      this.getMetricsForPeriod(userId, weekAgo, now),
      this.getMetricsForPeriod(userId, twoWeeksAgo, weekAgo),
    ]);

    return {
      responseTimeImprovement: this.calculateImprovement(
        previousWeek.averageResponseTime,
        currentWeek.averageResponseTime,
        true // Lower is better
      ),
      confidenceImprovement: this.calculateImprovement(
        previousWeek.averageConfidence,
        currentWeek.averageConfidence
      ),
      errorRateChange: this.calculateImprovement(
        previousWeek.errorRate,
        currentWeek.errorRate,
        true // Lower is better
      ),
    };
  }

  private calculateImprovement(
    previous: number,
    current: number,
    lowerIsBetter: boolean = false
  ): number {
    if (previous === 0) return 0;
    const change = ((current - previous) / previous) * 100;
    return lowerIsBetter ? -change : change;
  }

  private async getMetricsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VoiceMetrics> {
    const interactions = (await this.prisma.voiceInteraction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })) as unknown as VoiceInteractionData[];

    return this.calculateMetrics(interactions);
  }

  private extractCommonPhrases(transcripts: string[]): string[] {
    // Simple common phrase extraction
    const phraseCounts = new Map<string, number>();

    transcripts.forEach(transcript => {
      // Extract 3-5 word phrases
      const words = transcript.toLowerCase().split(/\s+/);
      for (let len = 3; len <= 5; len++) {
        for (let i = 0; i <= words.length - len; i++) {
          const phrase = words.slice(i, i + len).join(' ');
          phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
        }
      }
    });

    return Array.from(phraseCounts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  private groupByDay(interactions: VoiceInteractionData[]): Record<string, number> {
    const groups: Record<string, number> = {};

    interactions.forEach(interaction => {
      const date = new Date(interaction.createdAt).toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + 1;
    });

    return groups;
  }

  private calculateHourlyDistribution(interactions: VoiceInteractionData[]): number[] {
    const hourCounts = new Array(24).fill(0);

    interactions.forEach(interaction => {
      const hour = new Date(interaction.createdAt).getHours();
      hourCounts[hour]++;
    });

    return hourCounts;
  }

  private async getTopQueries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ query: string; count: number }>> {
    const interactions = await this.prisma.voiceInteraction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { inputText: true },
    });

    const queryCounts = new Map<string, number>();
    interactions.forEach(({ inputText }) => {
      if (inputText) {
        queryCounts.set(inputText, (queryCounts.get(inputText) || 0) + 1);
      }
    });

    return Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
  }

  private daysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private getStartDate(timeRange: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async updateUserVoiceStats(
    userId: string,
    interaction: TrackingInteractionData
  ): Promise<void> {
    try {
      // Update user voice preferences based on usage patterns
      // This could include updating preferred voice settings, language, etc.
      this.logger.debug(`Updating voice stats for user ${userId}`, {
        intent: interaction.intent,
        confidence: interaction.confidence,
        responseTime: interaction.responseTime,
        success: interaction.success,
      });

      // In a complete implementation, this would update user preferences
      // based on the interaction patterns, voice settings, language usage, etc.
    } catch (error) {
      this.logger.error('Failed to update user voice stats', error);
      throw new BusinessException(
        'Failed to update user voice statistics',
        'VOICE_STATS_UPDATE_FAILED',
        500
      );
    }
  }

  private async handleLowConfidenceInteraction(
    userId: string,
    interaction: TrackingInteractionData
  ): Promise<void> {
    try {
      // Log and potentially notify about low confidence interactions
      this.logger.warn(
        `Low confidence interaction for user ${userId}: confidence=${interaction.confidence}, success=${interaction.success}`
      );

      // In a complete implementation, this could trigger additional actions:
      // - Send notification to user about potential issues
      // - Store feedback for voice recognition improvement
      // - Adjust user-specific recognition parameters
    } catch (error) {
      this.logger.error('Failed to handle low confidence interaction', error);
      // Don't throw here as this is a background operation
    }
  }
}
