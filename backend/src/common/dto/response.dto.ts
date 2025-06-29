import { ApiProperty } from '@nestjs/swagger';

// Interface for response data
export interface ResponseData {
  [key: string]: string | number | boolean | null | ResponseData | ResponseData[];
}

// Interface for error details
interface ErrorDetails {
  field?: string;
  code?: string;
  message?: string;
  value?: string | number | boolean;
  [key: string]: string | number | boolean | undefined;
}

// Interface for error structure
interface ResponseError {
  code: string;
  message: string;
  details?: ErrorDetails;
}

export class ResponseDto<T extends ResponseData = ResponseData> {
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
    details?: ErrorDetails;
  };

  constructor(success: boolean, data?: T, message?: string, error?: ResponseError) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    if (error) {
      this.error = error;
    }
  }

  static success<T extends ResponseData>(data?: T, message?: string): ResponseDto<T> {
    return new ResponseDto(true, data, message);
  }

  static error(code: string, message: string, details?: ErrorDetails): ResponseDto<ResponseData> {
    return new ResponseDto<ResponseData>(false, undefined, message, {
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
