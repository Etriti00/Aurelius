import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

interface ClassConstructor {
  new (...args: Array<string | number | boolean | object>): object;
}

@Injectable()
export class TransformPipe implements PipeTransform {
  transform(
    value: string | number | boolean | object | null | undefined,
    metadata: ArgumentMetadata
  ): string | number | boolean | object | null | undefined {
    const { metatype } = metadata;

    if (!metatype || !this.toTransform(metatype as ClassConstructor)) {
      return value;
    }

    const objectValue = typeof value === 'object' && value !== null ? value : {};
    return plainToInstance(metatype as ClassConstructor, objectValue, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });
  }

  private toTransform(metatype: ClassConstructor): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.some(type => type === metatype);
  }
}
