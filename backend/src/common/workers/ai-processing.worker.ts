import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { PrismaService } from '../../prisma/prisma.service'
import { AiGatewayService } from '../../modules/ai-gateway/ai-gateway.service'
import { WebsocketService } from '../../modules/websocket/websocket.service'
import { VectorService } from '../services/vector.service'

interface AIProcessingJobData {
  type:
    | 'task_analysis'
    | 'email_summary'
    | 'meeting_prep'
    | 'embedding_generation'
    | 'insight_generation'
  userId: string,
  entityId: string
  entityType?: string
  data?: Record<string, unknown>
}

interface TaskAnalysisJobData extends AIProcessingJobData {
  type: 'task_analysis',
  taskId: string,
  taskTitle: string,
  taskDescription?: string
}

interface EmailSummaryJobData extends AIProcessingJobData {
  type: 'email_summary',
  emailId: string,
  emailContent: string,
  threadHistory?: string[]
}

interface MeetingPrepJobData extends AIProcessingJobData {
  type: 'meeting_prep',
  eventId: string,
  eventTitle: string
  eventDescription?: string,
  attendees: string[]
}

interface EmbeddingJobData extends AIProcessingJobData {
  type: 'embedding_generation',
  text: string
  metadata?: Record<string, unknown>
}

interface InsightJobData extends AIProcessingJobData {
  type: 'insight_generation',
  context: string,
  insightType: string
}

@Processor('ai-processing')
export class AIProcessingWorker {
  private readonly logger = new Logger(AIProcessingWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly websocketService: WebsocketService,
    private readonly vectorService: VectorService,
  ) {}

  @Process('task_analysis')
  async handleTaskAnalysis(job: Job<TaskAnalysisJobData>) {
    try {
      this.logger.debug(`Processing task analysis job: ${job.id}`)
      const { userId, taskId, taskTitle, taskDescription } = job.data
  }

      // Update job progress
      await job.progress(10)

      // Generate AI analysis
      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Analyze this task: "${taskTitle}"${taskDescription ? `\n\nDescription: ${taskDescription}` : ''}`,
        systemPrompt: `You are Aurelius, analyzing a task to provide actionable insights. 

Analyze the given task and provide:
1. Priority assessment (High/Medium/Low)
2. Estimated time to complete
3. Required resources or dependencies
4. Suggested approach or breakdown
5. Potential risks or challenges

Respond in a structured, professional manner as "The Wise Advisor."`,
        userId,
        maxTokens: 1024,
      })

      await job.progress(50)

      // Store AI insight
      const existingInsight = await this.prisma.aIInsight.findFirst({
        where: { taskId },
      })

      if (existingInsight) {
        await this.prisma.aIInsight.update({
          where: { id: existingInsight.id },
          data: {,
            content: aiResponse.content,
            updatedAt: new Date(),
          },
        })
      } else {
        await this.prisma.aIInsight.create({
          data: {
            taskId,
            type: 'TASK_ANALYSIS',
            content: aiResponse.content,
          },
        })
      }

      await job.progress(80)

      // Generate embedding for semantic search
      await this.vectorService.createEmbedding({
        id: `task-${taskId}`,
        text: `${taskTitle} ${taskDescription || ''}`,
        metadata: { taskId, type: 'task_analysis' },
        entityType: 'task',
        entityId: taskId,
        userId,
      })

      await job.progress(90)

      // Send notification to user
      await this.websocketService.notifyAIInsight(userId, {
        id: taskId,
        type: 'task_analysis',
        content: aiResponse.content,
      })

      await job.progress(100)
      this.logger.debug(`Completed task analysis job: ${job.id}`)

      return { success: true, taskId, insightLength: aiResponse.content.length }
    } } catch (error) {
      this.logger.error(`Error processing task analysis job ${job.id}:`, error),
      throw error
    }

    } catch (error) {
      console.error('Error in ai-processing.worker.ts:', error)
      throw error
    }
  @Process('email_summary')
  async handleEmailSummary(job: Job<EmailSummaryJobData>) {
    try {
      this.logger.debug(`Processing email summary job: ${job.id}`)
      const { userId, emailId, emailContent, threadHistory } = job.data
  }

      await job.progress(10)

      const threadContext = threadHistory
        ? `\n\nThread History:\n${threadHistory.join('\n---\n')}`
        : ''

      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Summarize this email:\n\n${emailContent}${threadContext}`,
        systemPrompt: `You are Aurelius, providing intelligent email summaries.

Create a concise, actionable summary that includes:
1. Key points and decisions
2. Action items and deadlines
3. Important participants
4. Follow-up requirements
5. Suggested responses if applicable

Maintain "The Wise Advisor" tone - professional and insightful.`,
        userId,
        maxTokens: 1024,
      })

      await job.progress(50)

      // Store AI insight
      await this.prisma.aIInsight.create({
        data: {,
          emailMessageId: emailId,
          type: 'EMAIL_SUMMARY',
          content: aiResponse.content,
        },
      })

      await job.progress(80)

      // Generate embedding
      await this.vectorService.createEmbedding({
        id: `email-${emailId}`,
        text: emailContent,
        metadata: { emailId, type: 'email_summary' },
        entityType: 'email',
        entityId: emailId,
        userId,
      })

      await job.progress(100)
      this.logger.debug(`Completed email summary job: ${job.id}`)

      return { success: true, emailId, summaryLength: aiResponse.content.length }
    } } catch (error) {
      this.logger.error(`Error processing email summary job ${job.id}:`, error),
      throw error
    }

    } catch (error) {
      console.error('Error in ai-processing.worker.ts:', error)
      throw error
    }
  @Process('meeting_prep')
  async handleMeetingPrep(job: Job<MeetingPrepJobData>) {
    try {
      this.logger.debug(`Processing meeting prep job: ${job.id}`)
      const { userId, eventId, eventTitle, eventDescription, attendees } = job.data
  }

      await job.progress(10)

      const context = {
        title: eventTitle,
        description: eventDescription || '',
        attendees: attendees || [],
      }

      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Prepare briefing for meeting: "${eventTitle}"\n\nContext: ${JSON.stringify(context, null, 2)}`,
        systemPrompt: `You are Aurelius, preparing intelligent meeting briefings.

Create a comprehensive meeting preparation that includes:
1. Meeting overview and objectives
2. Participant background (if available)
3. Key discussion points
4. Suggested talking points
5. Potential questions to ask
6. Follow-up actions to prepare

Be thorough but concise, embodying "The Wise Advisor" persona.`,
        userId,
        maxTokens: 1536,
      })

      await job.progress(50)

      // Store AI insight
      await this.prisma.aIInsight.create({
        data: {,
          calendarEventId: eventId,
          type: 'MEETING_PREPARATION',
          content: aiResponse.content,
        },
      })

      await job.progress(80)

      // Generate embedding
      await this.vectorService.createEmbedding({
        id: `meeting-${eventId}`,
        text: `${eventTitle} ${eventDescription || ''}`,
        metadata: { eventId, type: 'meeting_prep', attendees },
        entityType: 'calendar',
        entityId: eventId,
        userId,
      })

      await job.progress(90)

      // Send notification
      await this.websocketService.notifyAIInsight(userId, {
        id: eventId,
        type: 'meeting_preparation',
        content: aiResponse.content,
      })

      await job.progress(100)
      this.logger.debug(`Completed meeting prep job: ${job.id}`)

      return { success: true, eventId, prepLength: aiResponse.content.length }
    } } catch (error) {
      this.logger.error(`Error processing meeting prep job ${job.id}:`, error),
      throw error
    }

    } catch (error) {
      console.error('Error in ai-processing.worker.ts:', error)
      throw error
    }
  @Process('embedding_generation')
  async handleEmbeddingGeneration(job: Job<EmbeddingJobData>) {
    try {
      this.logger.debug(`Processing embedding generation job: ${job.id}`)
      const { userId, entityId, entityType, text, metadata } = job.data
  }

      await job.progress(20)

      // Generate embedding
      const embedding = await this.vectorService.createEmbedding({
        id: `${entityType}-${entityId}`,
        text,
        metadata: metadata || {},
        entityType: entityType as 'task' | 'email' | 'calendar' | 'note',
        entityId,
        userId,
      })

      await job.progress(100)
      this.logger.debug(`Completed embedding generation job: ${job.id}`)

      return { success: true, embeddingId: embedding.id }
    } } catch (error) {
      this.logger.error(`Error processing embedding generation job ${job.id}:`, error),
      throw error
    }

    } catch (error) {
      console.error('Error in ai-processing.worker.ts:', error)
      throw error
    }
  @Process('insight_generation')
  async handleInsightGeneration(job: Job<InsightJobData>) {
    try {
      this.logger.debug(`Processing insight generation job: ${job.id}`)
      const { userId, entityId, context, insightType } = job.data
  }

      await job.progress(10)

      // Generate insights based on type
      let systemPrompt = 'You are Aurelius, providing intelligent insights.'
      const prompt = context

      switch (insightType) {
        case 'productivity':
          systemPrompt =
            'You are Aurelius, analyzing productivity patterns and providing actionable recommendations.'
          break
        case 'prioritization':
          systemPrompt = 'You are Aurelius, helping with task prioritization and time management.'
          break
        case 'workflow':
          systemPrompt =
            'You are Aurelius, optimizing workflows and suggesting process improvements.'
          break
        default:
          systemPrompt = 'You are Aurelius, providing general insights and recommendations.'
      }
      }

      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt,
        systemPrompt,
        userId,
        maxTokens: 512,
      })

      await job.progress(80)

      // Store insight
      await this.prisma.aIInsight.create({
        data: {,
          type: insightType.toUpperCase(),
          content: aiResponse.content,
          metadata: { entityId, insightType },
        },
      })

      await job.progress(90)

      // Send notification
      await this.websocketService.notifyAIInsight(userId, {
        id: entityId,
        type: insightType,
        content: aiResponse.content,
      })

      await job.progress(100)
      this.logger.debug(`Completed insight generation job: ${job.id}`)

      return { success: true, insightType, contentLength: aiResponse.content.length }
    } } catch (error) {
      this.logger.error(`Error processing insight generation job ${job.id}:`, error),
      throw error
    }

    } catch (error) {
      console.error('Error in ai-processing.worker.ts:', error)
      throw error
    }
  // Global error handler for failed jobs
  @Process()
  async handleFailedJob(job: Job) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts`)
  }

    // Notify user about the failure if it's a user-facing job
    if (job.data.userId) {
      await this.websocketService.notifyUser(job.data.userId, {
        title: 'AI Processing Failed',
        message: `Failed to process ${job.data.type}. Please try again later.`,
        type: 'error',
        metadata: { jobId: job.id, jobType: job.data.type },
      })
    }

}