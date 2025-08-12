import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { FileDownloadService } from './services/file-download.service';
import { MinioService } from './services/minio.service';
import { MediaProcessingService } from './services/media-processing.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    FileDownloadService,
    MinioService,
    MediaProcessingService,
  ],
  exports: [
    MediaService,
    FileDownloadService,
    MinioService,
    MediaProcessingService,
  ],
})
export class MediaModule {}