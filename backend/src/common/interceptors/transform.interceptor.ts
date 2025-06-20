import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto } from '../dto/response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
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
      }),
    );
  }
}