import { Injectable } from '@nestjs/common';
import { WebSocketService } from './websocket.service';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date;
  targetClients?: string[];
  targetRooms?: string[];
}

export interface NotificationSubscription {
  clientId: string;
  types: string[];
  createdAt: Date;
}

export interface NotificationStats {
  totalSent: number;
  totalByType: Record<string, number>;
  totalByPriority: Record<string, number>;
  activeSubscriptions: number;
}

@Injectable()
export class NotificationService {
  private subscriptions = new Map<string, NotificationSubscription>();
  private notificationHistory: Notification[] = [];
  private stats: NotificationStats = {
    totalSent: 0,
    totalByType: {},
    totalByPriority: {},
    activeSubscriptions: 0,
  };

  constructor(private readonly webSocketService: WebSocketService) {}

  async subscribe(clientId: string, types: string[]): Promise<void> {
    const subscription: NotificationSubscription = {
      clientId,
      types,
      createdAt: new Date(),
    };

    this.subscriptions.set(clientId, subscription);
    this.stats.activeSubscriptions = this.subscriptions.size;

    console.log(`Client ${clientId} subscribed to notifications: ${types.join(', ')}`);
  }

  async unsubscribe(clientId: string, types?: string[]): Promise<void> {
    if (!types) {
      // 取消所有订阅
      this.subscriptions.delete(clientId);
    } else {
      // 取消特定类型的订阅
      const subscription = this.subscriptions.get(clientId);
      if (subscription) {
        subscription.types = subscription.types.filter(type => !types.includes(type));
        if (subscription.types.length === 0) {
          this.subscriptions.delete(clientId);
        }
      }
    }

    this.stats.activeSubscriptions = this.subscriptions.size;
    console.log(`Client ${clientId} unsubscribed from notifications`);
  }

  async sendNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    const fullNotification: Notification = {
      ...notification,
      id: this.generateNotificationId(),
      createdAt: new Date(),
    };

    // 保存到历史记录
    this.notificationHistory.push(fullNotification);
    this.updateStats(fullNotification);

    // 发送通知
    await this.deliverNotification(fullNotification);

    return fullNotification.id;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    const { type, targetClients, targetRooms } = notification;

    if (targetClients && targetClients.length > 0) {
      // 发送给指定客户端
      targetClients.forEach(clientId => {
        const subscription = this.subscriptions.get(clientId);
        if (subscription && subscription.types.includes(type)) {
          this.webSocketService.sendToClient(clientId, 'notification', notification);
        }
      });
    } else if (targetRooms && targetRooms.length > 0) {
      // 发送给指定房间
      targetRooms.forEach(room => {
        const roomClients = this.webSocketService.getClientsByRoom(room);
        roomClients.forEach(client => {
          const subscription = this.subscriptions.get(client.id);
          if (subscription && subscription.types.includes(type)) {
            this.webSocketService.sendToClient(client.id, 'notification', notification);
          }
        });
      });
    } else {
      // 广播给所有订阅了该类型的客户端
      this.subscriptions.forEach((subscription, clientId) => {
        if (subscription.types.includes(type)) {
          this.webSocketService.sendToClient(clientId, 'notification', notification);
        }
      });
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(notification: Notification): void {
    this.stats.totalSent++;
    this.stats.totalByType[notification.type] = (this.stats.totalByType[notification.type] || 0) + 1;
    this.stats.totalByPriority[notification.priority] = (this.stats.totalByPriority[notification.priority] || 0) + 1;
  }

  // 预定义的通知类型方法
  async sendSpiderStatusNotification(status: string, data?: Record<string, unknown>): Promise<string> {
    return this.sendNotification({
      type: 'spider-status',
      title: 'Spider Status Update',
      message: `Spider status changed to: ${status}`,
      data,
      priority: 'medium',
    });
  }

  async sendErrorNotification(error: string, data?: Record<string, unknown>): Promise<string> {
    return this.sendNotification({
      type: 'error',
      title: 'Error Occurred',
      message: error,
      data,
      priority: 'high',
    });
  }

  async sendDataProcessingNotification(message: string, data?: Record<string, unknown>): Promise<string> {
    return this.sendNotification({
      type: 'data-processing',
      title: 'Data Processing Update',
      message,
      data,
      priority: 'low',
    });
  }

  async sendSystemNotification(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium', data?: Record<string, unknown>): Promise<string> {
    return this.sendNotification({
      type: 'system',
      title: 'System Notification',
      message,
      data,
      priority,
    });
  }

  async sendCustomNotification(
    type: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    data?: Record<string, unknown>,
    targetClients?: string[],
    targetRooms?: string[],
  ): Promise<string> {
    return this.sendNotification({
      type,
      title,
      message,
      data,
      priority,
      targetClients,
      targetRooms,
    });
  }

  // 查询和管理方法
  getSubscriptions(): NotificationSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  getSubscriptionByClient(clientId: string): NotificationSubscription | undefined {
    return this.subscriptions.get(clientId);
  }

  getNotificationHistory(limit?: number, type?: string): Notification[] {
    let history = this.notificationHistory;
    
    if (type) {
      history = history.filter(n => n.type === type);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getNotificationStats(): NotificationStats {
    return { ...this.stats };
  }

  clearNotificationHistory(): void {
    this.notificationHistory = [];
  }

  clearExpiredNotifications(): number {
    const now = new Date();
    const initialLength = this.notificationHistory.length;
    
    this.notificationHistory = this.notificationHistory.filter(notification => {
      return !notification.expiresAt || notification.expiresAt > now;
    });
    
    return initialLength - this.notificationHistory.length;
  }

  // 清理断开连接的客户端订阅
  cleanupDisconnectedClients(): number {
    const connectedClients = this.webSocketService.getConnectedClients();
    const connectedClientIds = new Set(connectedClients.map(client => client.id));
    
    let cleanedCount = 0;
    this.subscriptions.forEach((subscription, clientId) => {
      if (!connectedClientIds.has(clientId)) {
        this.subscriptions.delete(clientId);
        cleanedCount++;
      }
    });
    
    this.stats.activeSubscriptions = this.subscriptions.size;
    return cleanedCount;
  }
}