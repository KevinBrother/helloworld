import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface ConnectedClient {
  id: string;
  socket: Socket;
  rooms: string[];
  connectedAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  roomCounts: Record<string, number>;
  averageConnectionTime: number;
}

@Injectable()
export class WebSocketService {
  private connectedClients = new Map<string, ConnectedClient>();
  private connectionHistory: Array<{ clientId: string; connectedAt: Date; disconnectedAt?: Date }> = [];

  async handleConnection(socket: Socket): Promise<void> {
    const client: ConnectedClient = {
      id: socket.id,
      socket,
      rooms: [],
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connectedClients.set(socket.id, client);
    this.connectionHistory.push({
      clientId: socket.id,
      connectedAt: new Date(),
    });

    // 设置心跳检测
    this.setupHeartbeat(socket);

    console.log(`WebSocket client connected: ${socket.id}`);
    console.log(`Total active connections: ${this.connectedClients.size}`);
  }

  async handleDisconnection(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      this.connectedClients.delete(socket.id);
      
      // 更新连接历史
      const historyEntry = this.connectionHistory.find(h => h.clientId === socket.id && !h.disconnectedAt);
      if (historyEntry) {
        historyEntry.disconnectedAt = new Date();
      }
    }

    console.log(`WebSocket client disconnected: ${socket.id}`);
    console.log(`Total active connections: ${this.connectedClients.size}`);
  }

  private setupHeartbeat(socket: Socket): void {
    const heartbeatInterval = setInterval(() => {
      const client = this.connectedClients.get(socket.id);
      if (!client) {
        clearInterval(heartbeatInterval);
        return;
      }

      socket.emit('ping');
      
      // 检查客户端是否超时
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - client.lastActivity.getTime();
      if (timeSinceLastActivity > 60000) { // 60秒超时
        console.log(`Client ${socket.id} timed out`);
        socket.disconnect();
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 每30秒发送一次心跳

    socket.on('pong', () => {
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval);
    });
  }

  getConnectedClients(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  getClientById(clientId: string): ConnectedClient | undefined {
    return this.connectedClients.get(clientId);
  }

  getClientsByRoom(room: string): ConnectedClient[] {
    return Array.from(this.connectedClients.values())
      .filter(client => client.rooms.includes(room));
  }

  addClientToRoom(clientId: string, room: string): boolean {
    const client = this.connectedClients.get(clientId);
    if (client && !client.rooms.includes(room)) {
      client.rooms.push(room);
      return true;
    }
    return false;
  }

  removeClientFromRoom(clientId: string, room: string): boolean {
    const client = this.connectedClients.get(clientId);
    if (client) {
      const index = client.rooms.indexOf(room);
      if (index > -1) {
        client.rooms.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  updateClientMetadata(clientId: string, metadata: Record<string, any>): boolean {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.metadata = { ...client.metadata, ...metadata };
      client.lastActivity = new Date();
      return true;
    }
    return false;
  }

  getConnectionStats(): ConnectionStats {
    const activeConnections = this.connectedClients.size;
    const totalConnections = this.connectionHistory.length;
    
    // 计算房间统计
    const roomCounts: Record<string, number> = {};
    this.connectedClients.forEach(client => {
      client.rooms.forEach(room => {
        roomCounts[room] = (roomCounts[room] || 0) + 1;
      });
    });

    // 计算平均连接时间
    const completedConnections = this.connectionHistory.filter(h => h.disconnectedAt);
    const averageConnectionTime = completedConnections.length > 0
      ? completedConnections.reduce((sum, h) => {
          const duration = h.disconnectedAt!.getTime() - h.connectedAt.getTime();
          return sum + duration;
        }, 0) / completedConnections.length
      : 0;

    return {
      totalConnections,
      activeConnections,
      roomCounts,
      averageConnectionTime,
    };
  }

  broadcastToAll(event: string, data: any): void {
    this.connectedClients.forEach(client => {
      client.socket.emit(event, data);
    });
  }

  broadcastToRoom(room: string, event: string, data: any): void {
    this.getClientsByRoom(room).forEach(client => {
      client.socket.emit(event, data);
    });
  }

  sendToClient(clientId: string, event: string, data: any): boolean {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.socket.emit(event, data);
      return true;
    }
    return false;
  }

  disconnectClient(clientId: string): boolean {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.socket.disconnect();
      return true;
    }
    return false;
  }

  disconnectAllClients(): void {
    this.connectedClients.forEach(client => {
      client.socket.disconnect();
    });
  }

  cleanupInactiveConnections(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    this.connectedClients.forEach((client, clientId) => {
      const timeSinceLastActivity = now.getTime() - client.lastActivity.getTime();
      if (timeSinceLastActivity > 300000) { // 5分钟无活动
        client.socket.disconnect();
        cleanedCount++;
      }
    });

    return cleanedCount;
  }
}