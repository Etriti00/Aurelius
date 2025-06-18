import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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