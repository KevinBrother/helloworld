import { Module } from '@nestjs/common';
import { MonitoringService } from './services/monitoring.service';
import { LoggingService } from './services/logging.service';
import { MetricsService } from './services/metrics.service';
import { HealthService } from './services/health.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  providers: [
    MonitoringService,
    LoggingService,
    MetricsService,
    HealthService,
  ],
  controllers: [MonitoringController],
  exports: [
    MonitoringService,
    LoggingService,
    MetricsService,
    HealthService,
  ],
})
export class MonitoringModule {}