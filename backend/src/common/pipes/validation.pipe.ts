import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

interface ClassConstructor {
  new (...args: Array<string | number | boolean | object>): object;
}

interface FormattedErrors {
  [property: string]: string[];
}

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  async transform(
    value: string | number | boolean | object | null | undefined,
    { metatype }: ArgumentMetadata
  ): Promise<string | number | boolean | object | null | undefined> {
    if (!metatype || !this.toValidate(metatype as ClassConstructor)) {
      return value;
    }

    const objectValue = typeof value === 'object' && value !== null ? value : {};
    const object = plainToInstance(metatype as ClassConstructor, objectValue);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = this.formatErrors(errors);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  private toValidate(metatype: ClassConstructor): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.some(type => type === metatype);
  }

  private formatErrors(errors: ValidationError[]): FormattedErrors {
    return errors.reduce<FormattedErrors>((acc, err) => {
      const property = err.property;
      const constraints = err.constraints || {};
      acc[property] = Object.values(constraints);
      return acc;
    }, {});
  }
}
