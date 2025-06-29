import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { JwtService } from '@nestjs/jwt';

interface RateLimitInfo {
  count: number;
  windowStart: number;
  lastEventTime: number;
}

interface ConnectionInfo {
  userId?: string;
  ipAddress: string;
  connectedAt: number;
  lastActivity: number;
  rateLimitInfo: RateLimitInfo;
  rooms: Set<string>;
}

interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  rateLimitViolations: number;
  errors: number;
  lastReset: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  maxHttpBufferSize: parseInt(process.env.WS_MAX_MESSAGE_SIZE || '65536', 10),
})
@Injectable()
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger: Logger = new Logger('AppWebSocketGateway');
  private readonly userSockets = new Map<string, string>(); // userId -> socketId
  private readonly connectionInfo = new Map<string, ConnectionInfo>(); // socketId -> ConnectionInfo
  private readonly ipConnections = new Map<string, Set<string>>(); // ip -> socketIds
  private readonly bannedIPs = new Set<string>();

  // Performance metrics
  private metrics: WebSocketMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    rateLimitViolations: 0,
    errors: 0,
    lastReset: Date.now(),
  };

  // Configuration from WebSocket config
  private readonly config: Record<string, unknown>;
  private metricsInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    this.config = this.configService.get('websocket') || {};
  }

  async afterInit(server: Server): Promise<void> {
    this.server = server;

    // Setup Redis adapter for horizontal scaling if enabled
    await this.setupRedisAdapter();

    // Setup monitoring and cleanup intervals
    this.setupMonitoring();
    this.setupCleanupTasks();

    // Setup graceful shutdown handlers
    this.setupGracefulShutdown();

    this.logger.log('WebSocket Gateway initialized with enterprise features');
  }

  private async setupRedisAdapter(): Promise<void> {
    const redisConfig = this.config['redis'] as Record<string, unknown>;

    if (!redisConfig?.['enabled']) {
      this.logger.debug('Redis adapter disabled');
      return;
    }

    try {
      const pubClient = createClient({
        socket: {
          host: (redisConfig['host'] as string) || 'localhost',
          port: (redisConfig['port'] as number) || 6379,
        },
        password: redisConfig['password'] as string,
        database: (redisConfig['db'] as number) || 1,
      });

      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.server.adapter(
        createAdapter(pubClient, subClient, {
          key: ((redisConfig['keyPrefix'] as string) || 'aurelius:ws:') + 'socket.io',
        })
      );

      this.logger.log('Redis adapter configured for horizontal scaling');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter:', error);
      // Continue without Redis adapter in case of failure
    }
  }

  private setupMonitoring(): void {
    const monitoringConfig = this.config['monitoring'] as Record<string, unknown>;

    if (!monitoringConfig?.['enabled']) return;

    const interval = (monitoringConfig['metricsInterval'] as number) || 30000;

    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.logMetrics();
    }, interval);
  }

  private setupCleanupTasks(): void {
    const roomsConfig = this.config['rooms'] as Record<string, unknown>;
    const cleanupConfig = roomsConfig?.['cleanup'] as Record<string, unknown>;

    if (!cleanupConfig?.['enabled']) return;

    const interval = (cleanupConfig['cleanupInterval'] as number) || 600000; // 10 minutes

    this.cleanupInterval = setInterval(() => {
      this.cleanupEmptyRooms();
      this.cleanupStaleConnections();
    }, interval);
  }

  private setupGracefulShutdown(): void {
    const shutdownConfig = this.config['shutdown'] as Record<string, unknown>;

    if (!shutdownConfig?.['enabled']) return;

    const notifyClients = shutdownConfig['notifyClients'] as boolean;

    process.on('SIGTERM', () => this.handleGracefulShutdown(notifyClients));
    process.on('SIGINT', () => this.handleGracefulShutdown(notifyClients));
  }

  private async handleGracefulShutdown(notifyClients: boolean): Promise<void> {
    this.logger.log('Initiating graceful shutdown...');

    if (notifyClients) {
      this.server.emit('system:maintenance', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date().toISOString(),
      });
    }

    // Clear intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Give clients time to receive the notification
    setTimeout(() => {
      this.server.close();
    }, 2000);
  }

  async handleConnection(client: Socket): Promise<void> {
    const ipAddress = this.getClientIP(client);

    try {
      // Check IP bans and rate limits
      if (!this.validateConnection(client, ipAddress)) {
        client.disconnect(true);
        return;
      }

      // Authenticate user
      const userId = await this.authenticateUser(client);

      // Track connection info
      const connectionInfo: ConnectionInfo = {
        userId,
        ipAddress,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        rateLimitInfo: {
          count: 0,
          windowStart: Date.now(),
          lastEventTime: 0,
        },
        rooms: new Set(),
      };

      this.connectionInfo.set(client.id, connectionInfo);

      // Track IP connections
      if (!this.ipConnections.has(ipAddress)) {
        this.ipConnections.set(ipAddress, new Set());
      }
      const ipConnectionSet = this.ipConnections.get(ipAddress);
      if (ipConnectionSet) {
        ipConnectionSet.add(client.id);
      }

      // Track user socket mapping
      if (userId) {
        this.userSockets.set(userId, client.id);
        client.join(`user:${userId}`);
        connectionInfo.rooms.add(`user:${userId}`);
        this.logger.log(`User ${userId} connected with socket ${client.id} from ${ipAddress}`);
      } else {
        this.logger.debug(`Anonymous connection: ${client.id} from ${ipAddress}`);
      }

      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      // Setup event rate limiting
      this.setupClientRateLimit(client);
    } catch (error) {
      this.logger.error(`Connection failed for ${client.id}:`, error);
      this.metrics.errors++;
      client.emit('auth_error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  private validateConnection(_client: Socket, ipAddress: string): boolean {
    // Check IP ban
    if (this.bannedIPs.has(ipAddress)) {
      this.logger.warn(`Blocked connection from banned IP: ${ipAddress}`);
      return false;
    }

    // Check IP connection limits
    const connectionLimits = this.config['connectionLimits'] as Record<string, unknown>;
    const maxConnectionsPerIP = (connectionLimits?.['maxConnectionsPerIP'] as number) || 10;

    const ipConnections = this.ipConnections.get(ipAddress);
    if (ipConnections && ipConnections.size >= maxConnectionsPerIP) {
      this.logger.warn(`IP ${ipAddress} exceeded connection limit`);
      this.banIP(ipAddress, 300000); // 5 minute ban
      return false;
    }

    // Check global connection limits
    const maxConnections = (connectionLimits?.['maxConnections'] as number) || 10000;
    if (this.metrics.activeConnections >= maxConnections) {
      this.logger.warn('Global connection limit reached');
      return false;
    }

    return true;
  }

  private async authenticateUser(client: Socket): Promise<string | undefined> {
    const authConfig = this.config['authentication'] as Record<string, unknown>;

    if (!authConfig?.['enabled']) {
      return undefined; // Auth disabled
    }

    const token = client.handshake.auth?.token;
    const allowAnonymous = authConfig['allowAnonymous'] as boolean;

    if (!token) {
      if (allowAnonymous) {
        return undefined;
      }
      throw new Error('Authentication token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload.sub || payload.userId;
    } catch (error) {
      if (allowAnonymous) {
        this.logger.debug('Invalid token, allowing anonymous connection');
        return undefined;
      }
      throw new Error('Invalid authentication token');
    }
  }

  private setupClientRateLimit(client: Socket): void {
    const originalEmit = client.emit.bind(client);

    client.emit = (event: string, ...args: unknown[]) => {
      if (this.checkRateLimit(client.id, event)) {
        return originalEmit(event, ...args);
      }
      return false;
    };
  }

  private checkRateLimit(socketId: string, event: string): boolean {
    const rateLimitConfig = this.config['rateLimit'] as Record<string, unknown>;

    if (!rateLimitConfig) return true;

    const connectionInfo = this.connectionInfo.get(socketId);
    if (!connectionInfo) return false;

    const now = Date.now();
    const windowSize = (rateLimitConfig['windowSizeMs'] as number) || 60000;
    const maxEventsPerSecond = (rateLimitConfig['maxEventsPerSecond'] as number) || 10;
    const maxEventsPerMinute = (rateLimitConfig['maxEventsPerMinute'] as number) || 100;

    // Reset window if needed
    if (now - connectionInfo.rateLimitInfo.windowStart > windowSize) {
      connectionInfo.rateLimitInfo.count = 0;
      connectionInfo.rateLimitInfo.windowStart = now;
    }

    // Check per-second rate limit
    if (now - connectionInfo.rateLimitInfo.lastEventTime < 1000) {
      const eventsThisSecond = connectionInfo.rateLimitInfo.count;
      if (eventsThisSecond >= maxEventsPerSecond) {
        this.metrics.rateLimitViolations++;
        this.logger.warn(`Rate limit exceeded for socket ${socketId}: ${event}`);
        return false;
      }
    }

    // Check per-minute rate limit
    if (connectionInfo.rateLimitInfo.count >= maxEventsPerMinute) {
      this.metrics.rateLimitViolations++;
      this.logger.warn(`Rate limit exceeded for socket ${socketId}: ${event}`);
      return false;
    }

    connectionInfo.rateLimitInfo.count++;
    connectionInfo.rateLimitInfo.lastEventTime = now;
    connectionInfo.lastActivity = now;
    this.metrics.totalMessages++;

    return true;
  }

  private getClientIP(client: Socket): string {
    return (
      (client.handshake.headers['x-forwarded-for'] as string) ||
      (client.handshake.headers['x-real-ip'] as string) ||
      client.conn.remoteAddress ||
      'unknown'
    );
  }

  private banIP(ipAddress: string, duration: number): void {
    this.bannedIPs.add(ipAddress);

    setTimeout(() => {
      this.bannedIPs.delete(ipAddress);
      this.logger.debug(`IP ban lifted for ${ipAddress}`);
    }, duration);

    this.logger.warn(`IP ${ipAddress} banned for ${duration}ms`);
  }

  handleDisconnect(client: Socket): void {
    const connectionInfo = this.connectionInfo.get(client.id);

    if (connectionInfo) {
      // Remove from user socket mapping
      if (connectionInfo.userId) {
        this.userSockets.delete(connectionInfo.userId);
        this.logger.log(`User ${connectionInfo.userId} disconnected`);
      }

      // Remove from IP connections tracking
      const ipConnections = this.ipConnections.get(connectionInfo.ipAddress);
      if (ipConnections) {
        ipConnections.delete(client.id);
        if (ipConnections.size === 0) {
          this.ipConnections.delete(connectionInfo.ipAddress);
        }
      }

      // Clean up connection info
      this.connectionInfo.delete(client.id);

      // Update metrics
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, data: { room: string }): void {
    if (!this.checkRateLimit(client.id, 'join-room')) {
      return;
    }

    const room = this.sanitizeRoomName(data.room);
    if (!this.validateRoomAccess(client, room)) {
      client.emit('error', { message: 'Access denied to room' });
      return;
    }

    const roomsConfig = this.config['rooms'] as Record<string, unknown>;
    const limits = roomsConfig?.['limits'] as Record<string, unknown>;
    const maxUsersPerRoom = (limits?.['maxUsersPerRoom'] as number) || 1000;

    // Check room size limit
    const roomSize = this.server.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomSize >= maxUsersPerRoom) {
      client.emit('error', { message: 'Room is full' });
      return;
    }

    client.join(room);

    const connectionInfo = this.connectionInfo.get(client.id);
    if (connectionInfo) {
      connectionInfo.rooms.add(room);
    }

    this.logger.debug(`Socket ${client.id} joined room ${room}`);
    client.emit('room:joined', { room, userCount: roomSize + 1 });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, data: { room: string }): void {
    if (!this.checkRateLimit(client.id, 'leave-room')) {
      return;
    }

    const room = this.sanitizeRoomName(data.room);
    client.leave(room);

    const connectionInfo = this.connectionInfo.get(client.id);
    if (connectionInfo) {
      connectionInfo.rooms.delete(room);
    }

    const roomSize = this.server.sockets.adapter.rooms.get(room)?.size || 0;
    this.logger.debug(`Socket ${client.id} left room ${room}`);
    client.emit('room:left', { room, userCount: roomSize });
  }

  private sanitizeRoomName(room: string): string {
    // Remove any potentially malicious characters
    return room.replace(/[^a-zA-Z0-9:_-]/g, '').substring(0, 100);
  }

  private validateRoomAccess(client: Socket, room: string): boolean {
    const connectionInfo = this.connectionInfo.get(client.id);
    if (!connectionInfo) return false;

    // Check max rooms per user
    const roomsConfig = this.config['rooms'] as Record<string, unknown>;
    const limits = roomsConfig?.['limits'] as Record<string, unknown>;
    const maxRoomsPerUser = (limits?.['maxRoomsPerUser'] as number) || 50;

    if (connectionInfo.rooms.size >= maxRoomsPerUser) {
      return false;
    }

    // Validate room naming patterns
    const validPatterns = [
      /^user:[a-zA-Z0-9-]+$/, // user:userId
      /^room:[a-zA-Z0-9-]+$/, // room:roomId
      /^org:[a-zA-Z0-9-]+$/, // org:orgId
      /^system$/, // system
      /^broadcast$/, // broadcast
    ];

    return validPatterns.some(pattern => pattern.test(room));
  }

  // Enhanced message sending with validation and throttling
  sendToUser(userId: string, event: string, data: Record<string, unknown>): boolean {
    if (!this.validateEventData(event, data)) {
      this.logger.warn(`Invalid event data for user ${userId}: ${event}`);
      return false;
    }

    const eventData = this.sanitizeEventData(data);
    this.server.to(`user:${userId}`).emit(event, eventData);
    return true;
  }

  // Send message to all users with throttling
  sendToAll(event: string, data: Record<string, unknown>): boolean {
    if (!this.validateEventData(event, data)) {
      this.logger.warn(`Invalid broadcast event data: ${event}`);
      return false;
    }

    const eventData = this.sanitizeEventData(data);
    this.server.emit(event, eventData);
    return true;
  }

  // Send message to room with validation
  sendToRoom(room: string, event: string, data: Record<string, unknown>): boolean {
    if (!this.validateEventData(event, data)) {
      this.logger.warn(`Invalid room event data for ${room}: ${event}`);
      return false;
    }

    const sanitizedRoom = this.sanitizeRoomName(room);
    const eventData = this.sanitizeEventData(data);
    this.server.to(sanitizedRoom).emit(event, eventData);
    return true;
  }

  private validateEventData(event: string, data: Record<string, unknown>): boolean {
    const securityConfig = this.config['security'] as Record<string, unknown>;
    const messageValidation = securityConfig?.['messageValidation'] as Record<string, unknown>;

    if (!messageValidation?.['enabled']) return true;

    // Check message size
    const maxSize = (messageValidation['maxMessageSize'] as number) || 65536;
    const dataString = JSON.stringify(data);
    if (dataString.length > maxSize) {
      this.logger.warn(`Message too large: ${dataString.length} > ${maxSize}`);
      return false;
    }

    // Check allowed events
    const allowedEvents = messageValidation['allowedEvents'] as string[];
    if (allowedEvents && allowedEvents.length > 0 && !allowedEvents.includes(event)) {
      this.logger.warn(`Event not allowed: ${event}`);
      return false;
    }

    return true;
  }

  private sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
    const securityConfig = this.config['security'] as Record<string, unknown>;
    const messageValidation = securityConfig?.['messageValidation'] as Record<string, unknown>;

    if (!messageValidation?.['sanitizeMessages']) {
      return data;
    }

    // Basic sanitization - remove potentially dangerous properties
    const sanitized = { ...data };
    delete sanitized['__proto__'];
    delete sanitized['constructor'];

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeEventData(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        // Basic XSS protection
        sanitized[key] = value.replace(/<script[^>]*>.*?<\/script>/gi, '');
      }
    }

    return sanitized;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Enhanced monitoring and metrics methods
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  getConnectionStats(): Record<string, unknown> {
    return {
      totalConnections: this.connectionInfo.size,
      authenticatedUsers: this.userSockets.size,
      anonymousConnections: this.connectionInfo.size - this.userSockets.size,
      uniqueIPs: this.ipConnections.size,
      bannedIPs: this.bannedIPs.size,
      totalRooms: this.server.sockets.adapter.rooms.size,
    };
  }

  private updateMetrics(): void {
    const now = Date.now();
    const timeDiff = now - this.metrics.lastReset;

    if (timeDiff > 0) {
      this.metrics.messagesPerSecond = (this.metrics.totalMessages * 1000) / timeDiff;
    }

    this.metrics.activeConnections = this.connectionInfo.size;
    this.metrics.lastReset = now;
  }

  private logMetrics(): void {
    const stats = this.getConnectionStats();
    this.logger.debug(`WebSocket Metrics:`, {
      ...this.metrics,
      ...stats,
    });
  }

  private cleanupEmptyRooms(): void {
    const rooms = this.server.sockets.adapter.rooms;
    const emptyRooms: string[] = [];

    for (const [roomName, sockets] of rooms) {
      if (sockets.size === 0) {
        emptyRooms.push(roomName);
      }
    }

    emptyRooms.forEach(room => {
      this.server.sockets.adapter.del('dummy-socket-id', room);
    });

    if (emptyRooms.length > 0) {
      this.logger.debug(`Cleaned up ${emptyRooms.length} empty rooms`);
    }
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleTimeout = 300000; // 5 minutes
    const staleConnections: string[] = [];

    for (const [socketId, info] of this.connectionInfo) {
      if (now - info.lastActivity > staleTimeout) {
        staleConnections.push(socketId);
      }
    }

    staleConnections.forEach(socketId => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    if (staleConnections.length > 0) {
      this.logger.debug(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  // Health check method for monitoring
  getHealthStatus(): Record<string, unknown> {
    const connectionLimits = this.config['connectionLimits'] as Record<string, unknown>;
    const maxConnections = (connectionLimits?.['maxConnections'] as number) || 1000;
    const isHealthy = this.metrics.activeConnections < maxConnections * 0.8;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: this.getMetrics(),
      connections: this.getConnectionStats(),
      timestamp: new Date().toISOString(),
    };
  }
}
