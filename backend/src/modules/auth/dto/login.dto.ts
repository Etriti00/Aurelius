import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  constructor() {
    this.email = '';
    this.password = '';
  }
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string = 'Bearer';

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    mfaEnabled: boolean;
  };

  constructor(
    accessToken: string = '',
    refreshToken: string = '',
    expiresIn: number = 0,
    user: any = { id: '', email: '', name: null, avatar: null, mfaEnabled: false }
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
    this.user = user;
  }
}
