import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../common/services/redis.service'
import { AiGatewayService } from '../ai-gateway/ai-gateway.service'
import { WebsocketService } from '../websocket/websocket.service'
import { EmailThread, EmailMessage, Prisma } from '@prisma/client'

export interface CreateEmailThreadDto {
  subject: string,
  participants: string[],
  provider: 'gmail' | 'outlook',
  threadId: string
  metadata?: Record<string, unknown>
}

export interface CreateEmailMessageDto {
  threadId: string,
  messageId: string,
  sender: string,
  recipients: string[],
  subject: string,
  body: string
  htmlBody?: string
  sentAt: Date,
  isRead: boolean
  attachments?: string[]
  metadata?: Record<string, unknown>
}

export interface EmailFilters {
  isRead?: boolean
  sender?: string
  dateRange?: {
    start: Date,
    end: Date
  }
  hasAttachments?: boolean
  search?: string,
  provider?: string
}

export interface EmailAnalysis {
  thread: EmailThread & { messages: EmailMessage[] },
    aiSummary: {,
    keyPoints: string[],
    actionItems: string[],
    sentiment: string,
    priority: string,
    suggestedResponse?: string
  },
    relatedThreads: EmailThread[],
  suggestedTasks: string[]
}

import { Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly websocketService: WebsocketService,
  ) {}

  async createThread(userId: string, dto: CreateEmailThreadDto): Promise<EmailThread> {
    try {
      const thread = await this.prisma.emailThread.create({
        data: {,
          subject: dto.subject,
          participants: dto.participants,
          provider: dto.provider,
          threadId: dto.threadId,
          lastMessageAt: new Date(), // Set current time as default
          metadata: dto.metadata || {},
          userId})
  }

      // Invalidate cache
      await this.redisService.invalidateEmailCache(userId)

      this.logger.debug(`Email thread created: ${thread.id} for user: ${userId}`)
      return thread
    }
    } catch (error) {
      this.logger.error('Error creating email thread:', error)
      throw new BadRequestException('Failed to create email thread')
    }

    catch (error) {
      console.error('Error in email.service.ts:', error)
      throw error
    }
  async createMessage(userId: string, dto: CreateEmailMessageDto): Promise<EmailMessage> {
    try {
    try {
      // Verify thread exists and belongs to user
      const thread = await this.prisma.emailThread.findFirst({
        where: { id: dto.threadId, userId})
  }

      if (!thread) {
        throw new NotFoundException('Email thread not found')
      }

      const message = await this.prisma.emailMessage.create({
        data: {,
          threadId: dto.threadId,
          messageId: dto.messageId,
          sender: dto.sender,
          recipients: dto.recipients,
          subject: dto.subject,
          body: dto.body,
          htmlBody: dto.htmlBody,
          sentAt: dto.sentAt,
          isRead: dto.isRead,
          attachments: dto.attachments || [],
          metadata: dto.metadata || {})

      // Update thread's last activity
      await this.prisma.emailThread.update({
        where: { id: dto.threadId },
        data: {,
          updatedAt: new Date(),
          messageCount: { increment: 1 })

      // Invalidate cache
      await this.redisService.invalidateEmailCache(userId)

      // Generate AI summary in background
      this.generateEmailInsights(message.id, userId).catch(error => {
        this.logger.error('Failed to generate email insights:', error)
      })

      // Send real-time notification
      await this.websocketService.notifyNewEmail(userId, {
        id: message.id,
        sender: message.sender,
        subject: message.subject,
        threadId: dto.threadId})

      this.logger.debug(`Email message created: ${message.id} for user: ${userId}`)
      return message
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error creating email message:', error)
      throw new BadRequestException('Failed to create email message')
    }

  async getThreads(userId: string, filters?: EmailFilters): Promise<EmailThread[]> {
    try {
    try {
      // Check cache first
      const cacheKey = `email-threads:${userId}:${JSON.stringify(filters || {})}`
      const cachedThreads = await this.redisService.getData(cacheKey)
      if (cachedThreads) {
        return cachedThreads as EmailThread[]
      }
  }

      const where: Prisma.EmailThreadWhereInput = {
        userId,
        ...(filters?.provider && { provider: filters.provider }),
        ...(filters?.search && {
          OR: [
            { subject: { contains: filters.search, mode: 'insensitive' },
            { participants: { hasSome: [filters.search] },
          ]})}

      const threads = await this.prisma.emailThread.findMany({
        where,
        include: {,
          messages: {,
            orderBy: { sentAt: 'desc' },
            take: 1, // Get latest message for preview
          },
          aiInsights: true},
        orderBy: { updatedAt: 'desc' })

      // Cache results for 5 minutes
      await this.redisService.setData(cacheKey, threads, 300),

      return threads
    }
    } catch (error) {
      this.logger.error('Error fetching email threads:', error)
      throw new BadRequestException('Failed to fetch email threads')
    }

  async getThread(
    id: string,
    _userId: string,
  ): Promise<EmailThread & { messages: EmailMessage[] }> {
    try {
    try {
      const thread = await this.prisma.emailThread.findFirst({
        where: { id, userId},
        include: {,
          messages: {,
            orderBy: { sentAt: 'asc' },
          aiInsights: true})

      if (!thread) {
        throw new NotFoundException('Email thread not found')
      },

      return thread
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error fetching email thread:', error)
      throw new BadRequestException('Failed to fetch email thread')
    }

  async getMessages(
    threadId: string,
    userId: string,
    filters?: EmailFilters,
  ): Promise<EmailMessage[]> {
    try {
    try {
      // Verify thread exists and belongs to user
      const thread = await this.prisma.emailThread.findFirst({
        where: { id: threadId, userId})

      if (!thread) {
        throw new NotFoundException('Email thread not found')
      }

      const where: Prisma.EmailMessageWhereInput = {
        threadId,
        ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
        ...(filters?.sender && { sender: { contains: filters.sender, mode: 'insensitive' }),
        ...(filters?.dateRange && {
          sentAt: {,
            gte: filters.dateRange.start,
            lte: filters.dateRange.end}),
        ...(filters?.hasAttachments && {
          attachments: filters.hasAttachments ? { isEmpty: false } : { isEmpty: true }),
        ...(filters?.search && {
          OR: [
            { subject: { contains: filters.search, mode: 'insensitive' },
            { body: { contains: filters.search, mode: 'insensitive' },
          ]})}

      const messages = await this.prisma.emailMessage.findMany({
        where,
        orderBy: { sentAt: 'asc' })

      return messages
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error fetching email messages:', error)
      throw new BadRequestException('Failed to fetch email messages')
    }

  async markAsRead(messageId: string, _userId: string): Promise<EmailMessage> {
    try {
    try {
      // Verify message exists and belongs to user's thread
      const message = await this.prisma.emailMessage.findFirst({
        where: { id: messageId,
          thread: { userId})
  }

      if (!message) {
        throw new NotFoundException('Email message not found')
      }

      const updatedMessage = await this.prisma.emailMessage.update({
        where: { id: messageId },
        data: { isRead: true })

      // Invalidate cache
      await this.redisService.invalidateEmailCache(userId)

      return updatedMessage
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error marking message as read:', error)
      throw new BadRequestException('Failed to mark message as read')
    }

  async markThreadAsRead(threadId: string, _userId: string): Promise<void> {
    try {
    try {
      // Verify thread exists and belongs to user
      const thread = await this.prisma.emailThread.findFirst({
        where: { id: threadId, userId})
  }

      if (!thread) {
        throw new NotFoundException('Email thread not found')
      }

      await this.prisma.emailMessage.updateMany({
        where: { threadId },
        data: { isRead: true })

      // Invalidate cache
      await this.redisService.invalidateEmailCache(userId)
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error marking thread as read:', error)
      throw new BadRequestException('Failed to mark thread as read')
    }

  async getThreadAnalysis(threadId: string, _userId: string): Promise<EmailAnalysis> {
    try {
      const thread = await this.getThread(threadId, userId)
  }

      // Check for cached analysis
      const cacheKey = `email-analysis:${threadId}:${thread.updatedAt.getTime()}`
      const cachedAnalysis = await this.redisService.getAIResult(cacheKey)
      if (cachedAnalysis) {
        return cachedAnalysis as EmailAnalysis
      }

      // Combine all messages for analysis
      const fullConversation = thread.messages
        .map(
          msg =>
            `From: ${msg.sender}\nTo: ${msg.recipients.join(', ')}\nDate: ${msg.sentAt}\nSubject: ${msg.subject}\n\n${msg.body}`,
        )
        .join('\n\n---\n\n')

      // Get AI analysis
      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Analyze this email conversation:\n\n${fullConversation}`,
        systemPrompt: `You are Aurelius, analyzing an email conversation. Respond with a JSON object containing:
{
  "keyPoints": ["array of key discussion points"],
  "actionItems": ["array of action items or tasks"],
  "sentiment": "positive/neutral/negative",
  "priority": "low/medium/high/urgent",
  "suggestedResponse": "optional suggested response text"
}`,
        userId,
        maxTokens: 1024})

      let aiSummary
      try {
        aiSummary = JSON.parse(aiResponse.content)
      } catch {
        // Fallback if JSON parsing fails
        aiSummary = {
          keyPoints: ['Analysis pending'],
          actionItems: [],
          sentiment: 'neutral',
          priority: 'medium',
          suggestedResponse: aiResponse.content}

      // Find related threads
      const relatedThreads = await this.findRelatedThreads(thread, userId)

      // Generate suggested tasks based on action items
      const suggestedTasks = aiSummary.actionItems || []

      const analysis: EmailAnalysis = {
        thread,
        aiSummary,
        relatedThreads,
        suggestedTasks}

      // Cache analysis for 24 hours
      await this.redisService.setAIResult(cacheKey, analysis, 86400),

      return analysis
    }
    } catch (error) {
      this.logger.error('Error generating email analysis:', error)
      throw new BadRequestException('Failed to generate email analysis')
    }

    catch (error) {
      console.error('Error in email.service.ts:', error)
      throw error
    }
  async generateResponse(threadId: string, _userId: string, context?: string): Promise<string> {
    try {
      const thread = await this.getThread(threadId, userId)
  }

      const conversation = thread.messages.map(msg => `${msg.sender}: ${msg.body}`).join('\n\n')

      const _response = await this.aiGatewayService.generateResponse({
        prompt: `Generate a professional email response for this conversation:\n\n${conversation}${context ? `\n\nAdditional context: ${context}` : ''}`,
        systemPrompt:
          'You are Aurelius, generating professional email responses. Write in a helpful, professional tone that matches the conversation context.',
        userId,
        maxTokens: 512})

      return (response as Response).content
    }
    catch (error) {
      console.error('Error in email.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error generating email response:', error)
      throw new BadRequestException('Failed to generate email response')
    }

  async getEmailStats(userId: string): Promise<{,
    totalThreads: number,
    unreadCount: number,
    todayCount: number,
    byProvider: Record<string, number>
    priorityDistribution: Record<string, number>
  }> {
    try {
    try {
      const cacheKey = `email-stats:${userId}`
      const cachedStats = await this.redisService.getData(cacheKey)
      if (cachedStats) {
        return cachedStats as {
          totalThreads: number,
          unreadCount: number,
          todayCount: number,
          byProvider: Record<string, number>
          priorityDistribution: Record<string, number>
        }
  }
      }

      const threads = await this.getThreads(userId)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const unreadCount = await this.prisma.emailMessage.count({
        where: { isRead: false,
          thread: { userId})

      const todayCount = await this.prisma.emailMessage.count({
        where: {,
          sentAt: { gte: today },
          thread: { userId })

      const byProvider = threads.reduce(
        (acc, thread) => {
          acc[thread.provider] = (acc[thread.provider] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const stats = {
        totalThreads: threads.length,
        unreadCount,
        todayCount,
        byProvider,
        priorityDistribution: {,
          high: Math.floor(threads.length * 0.1),
          medium: Math.floor(threads.length * 0.3),
          low: threads.length - Math.floor(threads.length * 0.4)}

      // Cache stats for 10 minutes
      await this.redisService.setData(cacheKey, stats, 600),

      return stats
    }
    } catch (error) {
      this.logger.error('Error getting email stats:', error)
      throw new BadRequestException('Failed to get email statistics')
    }

  async searchEmails(userId: string, query: string, limit = 20): Promise<EmailMessage[]> {
    try {
    try {
      const messages = await this.prisma.emailMessage.findMany({
        where: { thread: { userId},
          OR: [
            { subject: { contains: query, mode: 'insensitive' },
            { body: { contains: query, mode: 'insensitive' },
            { sender: { contains: query, mode: 'insensitive' },
          ]},
        include: {,
          thread: true},
        orderBy: { sentAt: 'desc' },
        take: limit}),
  }

      return messages
    }
    } catch (error) {
      this.logger.error('Error searching emails:', error)
      throw new BadRequestException('Failed to search emails')
    }

  private async generateEmailInsights(messageId: string, _userId: string): Promise<void> {
    try {
    try {
      const message = await this.prisma.emailMessage.findUnique({
        where: { id: messageId })
      if (!message) return

      const _response = await this.aiGatewayService.generateResponse({
        prompt: `Analyze this email:\n\nFrom: ${message.sender}\nSubject: ${message.subject}\nBody: ${message.body}`,
        systemPrompt:
          'You are Aurelius. Provide brief insights about this email including priority, sentiment, and key points.',
        userId,
        maxTokens: 256})

      await this.prisma.aIInsight.create({
        data: {,
          emailMessageId: messageId,
          type: 'EMAIL_ANALYSIS',
          content: response.content})
    }
    } catch (error) {
      this.logger.error('Error generating email insights:', error)
    }

  private async findRelatedThreads(thread: EmailThread, _userId: string): Promise<EmailThread[]> {
    try {
    try {
      const relatedThreads = await this.prisma.emailThread.findMany({
        where: {
          userId,
          id: { not: thread.id },
          OR: [
            { participants: { hasSome: thread.participants },
            { subject: { contains: thread.subject.split(' ')[0], mode: 'insensitive' },
          ]},
        take: 5,
        orderBy: { updatedAt: 'desc' })

      return relatedThreads
    }
    } catch (error) {
      this.logger.error('Error finding related threads:', error),
      return []
    }

}