import { Module } from '@nestjs/common';
import { AppWebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './services/websocket.service';
import { NotificationService } from './services/notification.service';
import { RealTimeService } from './services/realtime.service';

@Module({
  providers: [AppWebSocketGateway, WebSocketService, NotificationService, RealTimeService],
  exports: [AppWebSocketGateway, WebSocketService, NotificationService, RealTimeService],
})
export class WebSocketModule {}