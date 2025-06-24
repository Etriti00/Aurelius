import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface StandardResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, T | StandardResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<T | StandardResponse<T>> | Promise<Observable<T | StandardResponse<T>>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(data => {
        // Don't wrap already wrapped responses
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data &&
          'timestamp' in data
        ) {
          return data as StandardResponse<T>;
        }

        // Don't wrap file downloads or streaming responses
        if (
          response.getHeader('content-type')?.includes('application/octet-stream') ||
          response.getHeader('content-disposition')?.includes('attachment')
        ) {
          return data;
        }

        // Don't wrap WebSocket or SSE responses
        if (
          request.headers.upgrade === 'websocket' ||
          response.getHeader('content-type')?.includes('text/event-stream')
        ) {
          return data;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
