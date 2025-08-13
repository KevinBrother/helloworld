import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataProcessingService } from './services/data-processing.service';
import { DataValidationService } from './services/data-validation.service';
import { DataExportService } from './services/data-export.service';
import { DataStorageService } from './services/data-storage.service';
import { DataController } from './data.controller';
import {
  CrawledData,
  CrawledDataSchema,
} from '../../entities/mongodb/crawled-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrawledData.name, schema: CrawledDataSchema },
    ]),
  ],
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