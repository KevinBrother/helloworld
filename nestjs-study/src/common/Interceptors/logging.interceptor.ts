import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('LoggingInterceptor before');
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() =>
          console.log(`LoggingInterceptor after ${Date.now() - now}ms`),
        ),
      );
  }
}
