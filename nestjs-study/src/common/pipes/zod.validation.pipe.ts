import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}
  transform(value: any, metadata: ArgumentMetadata) {
    try {
      console.log(' ZodValidationPipe', value, metadata);
      const parsed = this.schema.parse(value);
      return parsed;
    } catch (error) {
      throw new BadRequestException(JSON.parse(error));
    }
  }
}
