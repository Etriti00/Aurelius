import { Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { RedisService } from '../../common/services/redis.service'
import { UsersService } from '../users/users.service'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userEmail?: string
}

interface NotificationPayload {
  title: string,
  message: string
  type: 'info' | 'success' | 'warning' | 'error',
  userId: string
  metadata?: Record<string, unknown>
}

@WebSocketGateway({
  cors: {,
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebsocketGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized')
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = this.extractTokenFromHandshake(client)
      if (!token) {
        this.logger.warn('Client connected without valid token')
        client.disconnect()
        return
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token)
      const user = await this.usersService.findById(payload.sub)

      if (!user) {
        this.logger.warn('Client connected with invalid user')
        client.disconnect()
        return
      }

      // Attach user info to socket
      client.userId = user.id
      client.userEmail = user.email

      // Join user-specific room
      await client.join(`user:${user.id}`)

      // Store connection state in Redis
      await this.redisService.setConnectionState(user.id, client.id, {
        connected: true,
        lastActivity: new Date(),
        rooms: [],
        metadata: {,
          connectedAt: new Date(),
          userAgent: client.handshake.headers['user-agent'],
          ip: client.handshake.address,
        },
      })

      this.logger.log(`User ${user.email} connected with socket ${client.id}`)

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to Aurelius',
        userId: user.id,
        createdAt: new Date(),
      })

      // Send any pending notifications
      await this.sendPendingNotifications(user.id, client)
    } catch (error) {
      this.logger.error('Error during connection:', error)
      client.disconnect()
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      if (client.userId) {
        // Clean up connection state
        await this.redisService.deleteConnectionState(client.userId, client.id)
        this.logger.log(`User ${client.userEmail} disconnected from socket ${client.id}`)
      }
    } catch (error) {
      this.logger.error('Error during disconnection:', error)
    }
  }

  // Task-related events
  @SubscribeMessage('task:create')
  async handleTaskCreate(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      // Broadcast to user's other sessions
      this.server.to(`user:${client.userId}`).emit('task:created', {
        type: 'task:created',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling task create:', error)
    }
  }

  @SubscribeMessage('task:update')
  async handleTaskUpdate(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      this.server.to(`user:${client.userId}`).emit('task:updated', {
        type: 'task:updated',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling task update:', error)
    }
  }

  @SubscribeMessage('task:complete')
  async handleTaskComplete(
    @MessageBody() data: { title: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      // Send celebration notification
      this.server.to(`user:${client.userId}`).emit('notification', {
        title: 'Task Completed! 🎉',
        message: `Great work completing "${data.title}"`,
        type: 'success',
        createdAt: new Date(),
      })

      this.server.to(`user:${client.userId}`).emit('task:completed', {
        type: 'task:completed',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling task complete:', error)
    }
  }

  // Email-related events
  @SubscribeMessage('email:received')
  async handleEmailReceived(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      this.server.to(`user:${client.userId}`).emit('email:new', {
        type: 'email:new',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling email received:', error)
    }
  }

  // Calendar-related events
  @SubscribeMessage('calendar:event:updated')
  async handleCalendarEventUpdated(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      this.server.to(`user:${client.userId}`).emit('calendar:updated', {
        type: 'calendar:updated',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling calendar event update:', error)
    }
  }

  // AI-related events
  @SubscribeMessage('ai:suggestion')
  async handleAISuggestion(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) return

      this.server.to(`user:${client.userId}`).emit('ai:suggestion:new', {
        type: 'ai:suggestion:new',
        data,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error handling AI suggestion:', error)
    }
  }

  // Generic ping-pong for connection health
  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      client.emit('pong', {
        createdAt: new Date(),
        userId: client.userId,
      })
    } catch (error) {
      this.logger.error('Error handling ping:', error)
    }
  }

  // Methods for other services to use
  async sendNotificationToUser(notification: NotificationPayload): Promise<void> {
    try {
      // Send real-time notification
      this.server.to(`user:${notification.userId}`).emit('notification', {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        createdAt: new Date(),
        metadata: notification.metadata,
      })

      // Store notification for offline users
      await this.storeNotificationForOfflineUser(notification)
    } catch (error) {
      this.logger.error('Error sending notification:', error)
    }
  }

  async broadcastTaskUpdate(userId: string, task: unknown): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit('task:updated', {
        type: 'task:updated',
        data: task,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error broadcasting task update:', error)
    }
  }

  async broadcastEmailUpdate(userId: string, email: unknown): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit('email:updated', {
        type: 'email:updated',
        data: email,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error broadcasting email update:', error)
    }
  }

  async broadcastCalendarUpdate(userId: string, event: unknown): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit('calendar:updated', {
        type: 'calendar:updated',
        data: event,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error broadcasting calendar update:', error)
    }
  }

  async broadcastAIInsight(userId: string, insight: unknown): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit('ai:insight', {
        type: 'ai:insight',
        data: insight,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error broadcasting AI insight:', error)
    }
  }

  async sendSystemAlert(message: string): Promise<void> {
    try {
      this.server.emit('system:alert', {
        type: 'system:alert',
        message,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.error('Error sending system alert:', error)
    }
  }

  async getUserConnections(userId: string): Promise<string[]> {
    try {
      const room = this.server.sockets.adapter.rooms.get(`user:${userId}`)
      return room ? Array.from(room) : []
    } catch (error) {
      this.logger.error('Error getting user connections:', error)
      return []
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const connections = await this.getUserConnections(userId)
      return connections.length > 0
    } catch (error) {
      this.logger.error('Error checking user online status:', error)
      return false
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    try {
      // Try to get token from auth header
      const authHeader = client.handshake.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7)
      }

      // Try to get token from query params
      const tokenFromQuery = client.handshake.query.token
      if (tokenFromQuery && typeof tokenFromQuery === 'string') {
        return tokenFromQuery
      }

      // Try to get token from cookies
      const cookies = client.handshake.headers.cookie
      if (cookies) {
        const tokenMatch = cookies.match(/token=([^;]+)/)
        if (tokenMatch) {
          return tokenMatch[1]
        }
      }

      return null
    } catch (error) {
      this.logger.error('Error extracting token:', error)
      return null
    }
  }

  private async sendPendingNotifications(userId: string, client: Socket): Promise<void> {
    try {
      const pendingNotifications = await this.redisService.getData(`notifications:${userId}`)
      if (pendingNotifications && Array.isArray(pendingNotifications)) {
        for (const notification of pendingNotifications) {
          client.emit('notification', notification)
        }
        // Clear pending notifications after sending
        await this.redisService.deleteData(`notifications:${userId}`)
      }
    } catch (error) {
      this.logger.error('Error sending pending notifications:', error)
    }
  }

  private async storeNotificationForOfflineUser(notification: NotificationPayload): Promise<void> {
    try {
      const isOnline = await this.isUserOnline(notification.userId)
      if (!isOnline) {
        const pendingKey = `notifications:${notification.userId}`
        const existing = (await this.redisService.getData<NotificationPayload[]>(pendingKey)) || []
        existing.push({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          userId: notification.userId,
          metadata: notification.metadata,
        })

        // Keep only last 10 notifications and expire after 7 days
        const notifications = existing.slice(-10)
        await this.redisService.setData(pendingKey, notifications, 7 * 24 * 3600)
      }
    } catch (error) {
      this.logger.error('Error storing notification for offline user:', error)
    }
  }
}
