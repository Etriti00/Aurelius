import { ApiProperty } from '@nestjs/swagger';

export class WorkflowTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template description' })
  description: string;

  @ApiProperty({ description: 'Template category' })
  category: string;

  @ApiProperty({ description: 'Required integrations' })
  requiredIntegrations: string[];

  @ApiProperty({ description: 'Estimated time saving (minutes/week)' })
  estimatedTimeSaving: number;

  @ApiProperty({ description: 'Popularity score (0-100)' })
  popularity: number;

  @ApiProperty({ description: 'Template tags' })
  tags: string[];

  constructor() {
    this.id = '';
    this.name = '';
    this.description = '';
    this.category = '';
    this.requiredIntegrations = [];
    this.estimatedTimeSaving = 0;
    this.popularity = 0;
    this.tags = [];
  }
}

export class TemplateSuggestionDto {
  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Reason for suggestion' })
  reason: string;

  @ApiProperty({ description: 'Potential time saving (minutes/week)' })
  potentialTimeSaving: number;

  constructor() {
    this.templateId = '';
    this.reason = '';
    this.potentialTimeSaving = 0;
  }
}