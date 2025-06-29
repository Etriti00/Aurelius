import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto } from '../dto/response.dto';

// Import ResponseData interface
interface ResponseData {
  [key: string]: string | number | boolean | null | ResponseData | ResponseData[];
}

@Injectable()
export class TransformInterceptor<T extends ResponseData = ResponseData>
  implements NestInterceptor<T, ResponseDto<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name);
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ResponseDto<T>> | Promise<Observable<ResponseDto<T>>> {
    const request = context.switchToHttp().getRequest();
    this.logger?.debug(`Transform interceptor applied to ${request.method} ${request.url}`);

    return next.handle().pipe(
      map(data => {
        // If data is already a ResponseDto, return it as is
        if (data instanceof ResponseDto) {
          return data;
        }

        // If data has a specific format (like paginated response), preserve it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return ResponseDto.success(data);
        }

        // Otherwise, wrap in standard response format
        return ResponseDto.success(data);
      })
    );
  }
}
