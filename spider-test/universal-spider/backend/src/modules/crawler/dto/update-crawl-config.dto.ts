import { PartialType } from '@nestjs/swagger';
import { CreateCrawlConfigDto } from './create-crawl-config.dto';

export class UpdateCrawlConfigDto extends PartialType(CreateCrawlConfigDto) {}