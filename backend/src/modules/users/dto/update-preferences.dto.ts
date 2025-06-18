import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'User preferences object with custom settings',
    example: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
        sound: true,
      },
      dashboard: {
        defaultView: 'overview',
        widgets: ['tasks', 'calendar', 'email'],
      },
      ai: {
        autoSuggestions: true,
        proactivity: 'high',
        voice: {
          autoPlay: false,
          speed: 1.0,
        },
      },
    },
  })
  @IsObject()
  preferences: Record<string, any>;
}