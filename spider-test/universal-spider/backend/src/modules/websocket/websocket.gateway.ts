import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { WebSocketService } from './services/websocket.service';
import { NotificationService } from './services/notification.service';
import { RealTimeService } from './services/realtime.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly notificationService: NotificationService,
    private readonly realTimeService: RealTimeService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    await this.webSocketService.handleConnection(client);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    await this.webSocketService.handleDisconnection(client);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.room);
    client.emit('joined-room', { room: data.room });
    console.log(`Client ${client.id} joined room: ${data.room}`);
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(data.room);
    client.emit('left-room', { room: data.room });
    console.log(`Client ${client.id} left room: ${data.room}`);
  }

  @SubscribeMessage('spider-status')
  async handleSpiderStatusRequest(
    @ConnectedSocket() client: Socket,
  ) {
    const status = await this.realTimeService.getSpiderStatus();
    client.emit('spider-status-update', status);
  }

  @SubscribeMessage('subscribe-notifications')
  async handleSubscribeNotifications(
    @MessageBody() data: { types: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    await this.notificationService.subscribe(client.id, data.types);
    client.emit('subscribed', { types: data.types });
  }

  @SubscribeMessage('unsubscribe-notifications')
  async handleUnsubscribeNotifications(
    @MessageBody() data: { types: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    await this.notificationService.unsubscribe(client.id, data.types);
    client.emit('unsubscribed', { types: data.types });
  }

  // 广播消息到所有客户端
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // 广播消息到指定房间
  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  // 发送消息到指定客户端
  sendToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }
}