import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate as isUuid } from 'uuid';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Value'} should not be empty`,
      );
    }

    if (!isUuid(value)) {
      throw new BadRequestException(
        `${metadata.data || 'Value'} is not a valid UUID`,
      );
    }

    return value;
  }
}