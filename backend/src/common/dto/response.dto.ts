import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ required: false })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  constructor(success: boolean, data?: T, message?: string, error?: any) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    if (error) {
      this.error = error;
    }
  }

  static success<T>(data?: T, message?: string): ResponseDto<T> {
    return new ResponseDto(true, data, message);
  }

  static error(code: string, message: string, details?: any): ResponseDto {
    return new ResponseDto(false, undefined, message, {
      code,
      message,
      details,
    });
  }
}

export class SuccessResponseDto {
  @ApiProperty({ default: true })
  success: boolean = true;

  @ApiProperty()
  message: string;

  constructor(message: string = 'Operation completed successfully') {
    this.message = message;
  }
}
