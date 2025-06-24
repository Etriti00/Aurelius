import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor<T> implements NestInterceptor<T, T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<T> | Promise<Observable<T>> {
    const timeoutMs = this.getTimeoutForContext(context);

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timeout'));
        }
        return throwError(() => err);
      })
    );
  }

  private getTimeoutForContext(context: ExecutionContext): number {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    // Set different timeouts for different endpoints
    if (path?.includes('/ai-gateway/')) {
      return 30000; // 30 seconds for AI operations
    }

    if (path?.includes('/voice/')) {
      return 60000; // 60 seconds for voice processing
    }

    if (path?.includes('/integrations/')) {
      return 15000; // 15 seconds for integration calls
    }

    return 10000; // 10 seconds default
  }
}
