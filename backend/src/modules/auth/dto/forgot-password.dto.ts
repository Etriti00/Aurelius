import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  declare email: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  constructor(success: boolean = false, message: string = '') {
    this.success = success;
    this.message = message;
  }
}
