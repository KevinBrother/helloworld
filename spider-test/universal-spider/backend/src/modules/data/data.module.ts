import { Module } from '@nestjs/common';
import { DataProcessingService } from './services/data-processing.service';
import { DataValidationService } from './services/data-validation.service';
import { DataExportService } from './services/data-export.service';
import { DataStorageService } from './services/data-storage.service';
import { DataController } from './data.controller';

@Module({
  controllers: [DataController],
  providers: [
    DataProcessingService,
    DataValidationService,
    DataExportService,
    DataStorageService,
  ],
  exports: [
    DataProcessingService,
    DataValidationService,
    DataExportService,
    DataStorageService,
  ],
})
export class DataModule {}