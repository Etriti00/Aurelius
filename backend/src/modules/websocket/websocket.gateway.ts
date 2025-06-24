import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger: Logger = new Logger('AppWebSocketGateway');
  private readonly userSockets = new Map<string, string>(); // userId -> socketId

  constructor() {
    this.server = new Server();
  }

  afterInit(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket): void {
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;

    if (userId) {
      this.userSockets.set(userId as string, client.id);
      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } else {
      this.logger.warn(`Connection without userId: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.findUserIdBySocketId(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string): void {
    client.join(room);
    this.logger.debug(`Socket ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, room: string): void {
    client.leave(room);
    this.logger.debug(`Socket ${client.id} left room ${room}`);
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Send message to all users
  sendToAll(data: any): void {
    this.server.emit('broadcast', data);
  }

  // Send message to room
  sendToRoom(room: string, data: any): void {
    this.server.to(room).emit('room-message', data);
  }

  private findUserIdBySocketId(socketId: string): string | undefined {
    for (const [userId, id] of this.userSockets.entries()) {
      if (id === socketId) {
        return userId;
      }
    }
    return undefined;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
