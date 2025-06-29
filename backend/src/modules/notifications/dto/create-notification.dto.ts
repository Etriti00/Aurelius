import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { NotificationType, NotificationPriority } from '../../../common/types/notification.types';

// Re-export for backward compatibility
export { NotificationType, NotificationPriority };

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string = '';

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType = NotificationType.SYSTEM_UPDATE;

  @ApiProperty()
  @IsString()
  title: string = '';

  @ApiProperty()
  @IsString()
  message: string = '';

  @ApiPropertyOptional({ enum: NotificationPriority })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Prisma.JsonValue;

  constructor(partial: Partial<CreateNotificationDto> = {}) {
    Object.assign(this, partial);
  }
}
