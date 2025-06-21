import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
}

export enum ImageFit {
  COVER = 'cover',
  CONTAIN = 'contain',
  FILL = 'fill',
  INSIDE = 'inside',
  OUTSIDE = 'outside',
}

export class ImageTransformDto {
  @ApiPropertyOptional({ 
    description: 'Target width',
    minimum: 1,
    maximum: 4096
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(4096)
  width?: number;

  @ApiPropertyOptional({ 
    description: 'Target height',
    minimum: 1,
    maximum: 4096
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(4096)
  height?: number;

  @ApiPropertyOptional({ 
    description: 'Image quality',
    minimum: 1,
    maximum: 100,
    default: 85
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  quality?: number = 85;

  @ApiPropertyOptional({ 
    enum: ImageFormat,
    description: 'Output format',
    default: ImageFormat.WEBP
  })
  @IsEnum(ImageFormat)
  @IsOptional()
  format?: ImageFormat = ImageFormat.WEBP;

  @ApiPropertyOptional({ 
    enum: ImageFit,
    description: 'How to fit the image',
    default: ImageFit.COVER
  })
  @IsEnum(ImageFit)
  @IsOptional()
  fit?: ImageFit = ImageFit.COVER;

  @ApiPropertyOptional({ 
    description: 'Blur radius',
    minimum: 0.3,
    maximum: 1000
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0.3)
  @Max(1000)
  blur?: number;

  @ApiPropertyOptional({ description: 'Apply sharpening' })
  @IsBoolean()
  @IsOptional()
  sharpen?: boolean;

  @ApiPropertyOptional({ description: 'Convert to grayscale' })
  @IsBoolean()
  @IsOptional()
  grayscale?: boolean;

  @ApiPropertyOptional({ 
    description: 'Rotation angle',
    minimum: -360,
    maximum: 360
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(-360)
  @Max(360)
  rotate?: number;

  constructor() {
    // All properties are optional, no initialization needed
  }
}

export class ImageUrlResponseDto {
  @ApiProperty({ description: 'Transformed image URL' })
  url: string;

  @ApiPropertyOptional({ description: 'CDN URL if available' })
  cdnUrl?: string;

  @ApiProperty({ description: 'Transformation parameters applied' })
  transformations: ImageTransformDto;

  constructor(
    url: string = ''
  ) {
    this.url = url;
    this.transformations = new ImageTransformDto();
  }
}