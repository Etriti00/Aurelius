import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { ImageTransformOptions } from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import * as sharp from 'sharp';
import { S3Service } from './s3.service';
import { CdnService } from './cdn.service';
import * as crypto from 'crypto';

interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'];
  private readonly maxFileSize: number;
  private readonly maxDimension: number;

  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
    private cdnService: CdnService,
  ) {
    this.maxFileSize = this.configService.get<number>('IMAGE_MAX_SIZE', 10 * 1024 * 1024); // 10MB
    this.maxDimension = this.configService.get<number>('IMAGE_MAX_DIMENSION', 4096);
  }

  /**
   * Process and optimize an image
   */
  async processImage(
    buffer: Buffer,
    options: ImageTransformOptions = {},
  ): Promise<ProcessedImage> {
    try {
      // Validate image
      const metadata = await sharp(buffer).metadata();
      this.validateImage(metadata);

      let pipeline = sharp(buffer);

      // Apply transformations
      if (options.rotate) {
        pipeline = pipeline.rotate(options.rotate);
      }

      if (options.width || options.height) {
        pipeline = pipeline.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'cover',
          withoutEnlargement: true,
        });
      }

      if (options.blur && options.blur > 0) {
        pipeline = pipeline.blur(options.blur);
      }

      if (options.sharpen) {
        pipeline = pipeline.sharpen();
      }

      if (options.grayscale) {
        pipeline = pipeline.grayscale();
      }

      // Set format and quality
      const format = options.format || this.getOptimalFormat(metadata.format);
      const quality = options.quality || this.getOptimalQuality(format);

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
      }

      const processedBuffer = await pipeline.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        format: processedMetadata.format || format,
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        size: processedBuffer.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to process image: ${error.message}`);
      throw new BusinessException(
        'Failed to process image',
        'IMAGE_PROCESSING_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Generate responsive image variants
   */
  async generateResponsiveVariants(
    buffer: Buffer,
    baseKey: string,
  ): Promise<Record<string, string>> {
    const variants = {
      thumbnail: { width: 150, height: 150, fit: 'cover' as const },
      small: { width: 320 },
      medium: { width: 768 },
      large: { width: 1200 },
      original: {},
    };

    const urls: Record<string, string> = {};

    try {
      for (const [variant, options] of Object.entries(variants)) {
        let processedImage: ProcessedImage;
        
        if (variant === 'original') {
          processedImage = await this.processImage(buffer, {
            format: 'webp',
            quality: 85,
          });
        } else {
          processedImage = await this.processImage(buffer, {
            ...options,
            format: 'webp',
            quality: 80,
          });
        }

        const key = `${baseKey}/${variant}.webp`;
        const file = await this.s3Service.upload(processedImage.buffer, key, {
          contentType: 'image/webp',
          metadata: {
            variant,
            width: processedImage.width.toString(),
            height: processedImage.height.toString(),
          },
        });

        urls[variant] = this.cdnService.getCdnUrl(file.key);
      }

      return urls;
    } catch (error: any) {
      this.logger.error(`Failed to generate responsive variants: ${error.message}`);
      throw new BusinessException(
        'Failed to generate image variants',
        'IMAGE_VARIANTS_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Extract and analyze image metadata
   */
  async analyzeImage(buffer: Buffer): Promise<{
    format: string;
    width: number;
    height: number;
    aspectRatio: string;
    size: number;
    hasAlpha: boolean;
    isAnimated: boolean;
    colorSpace?: string;
    density?: number;
    exif?: Record<string, any>;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();

      const aspectRatio = metadata.width && metadata.height
        ? this.calculateAspectRatio(metadata.width, metadata.height)
        : 'unknown';

      return {
        format: metadata.format || 'unknown',
        width: metadata.width || 0,
        height: metadata.height || 0,
        aspectRatio,
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        isAnimated: metadata.pages ? metadata.pages > 1 : false,
        colorSpace: metadata.space,
        density: metadata.density,
        exif: metadata.exif ? this.parseExif(metadata.exif) : undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to analyze image: ${error.message}`);
      throw new BusinessException(
        'Failed to analyze image',
        'IMAGE_ANALYSIS_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Generate blurhash for lazy loading
   */
  async generateBlurhash(buffer: Buffer): Promise<string> {
    try {
      // Resize image to small size for blurhash generation
      const smallBuffer = await sharp(buffer)
        .resize(32, 32, { fit: 'inside' })
        .raw()
        .toBuffer();

      // This would use a blurhash library
      // Placeholder implementation
      return this.generateHash(smallBuffer);
    } catch (error: any) {
      this.logger.error(`Failed to generate blurhash: ${error.message}`);
      // Return a default blurhash on error
      return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
    }
  }

  /**
   * Create image thumbnail
   */
  async createThumbnail(
    buffer: Buffer,
    width: number = 200,
    height: number = 200,
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'attention', // Smart cropping
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } catch (error: any) {
      this.logger.error(`Failed to create thumbnail: ${error.message}`);
      throw new BusinessException(
        'Failed to create thumbnail',
        'THUMBNAIL_CREATION_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Validate image
   */
  private validateImage(metadata: sharp.Metadata): void {
    if (!metadata.format || !this.supportedFormats.includes(metadata.format)) {
      throw new BusinessException(
        'Unsupported image format',
        'INVALID_IMAGE_FORMAT',
        { format: metadata.format },
      );
    }

    if (metadata.size && metadata.size > this.maxFileSize) {
      throw new BusinessException(
        'Image file too large',
        'IMAGE_TOO_LARGE',
        { size: metadata.size, maxSize: this.maxFileSize },
      );
    }

    if (
      (metadata.width && metadata.width > this.maxDimension) ||
      (metadata.height && metadata.height > this.maxDimension)
    ) {
      throw new BusinessException(
        'Image dimensions too large',
        'IMAGE_DIMENSIONS_TOO_LARGE',
        { 
          width: metadata.width,
          height: metadata.height,
          maxDimension: this.maxDimension,
        },
      );
    }
  }

  /**
   * Get optimal format based on input
   */
  private getOptimalFormat(inputFormat?: string): 'jpeg' | 'png' | 'webp' | 'avif' {
    // For now, default to WebP for best compression
    // In production, you might check browser support
    return 'webp';
  }

  /**
   * Get optimal quality based on format
   */
  private getOptimalQuality(format: string): number {
    const qualityMap: Record<string, number> = {
      jpeg: 85,
      png: 90,
      webp: 85,
      avif: 80,
    };
    return qualityMap[format] || 85;
  }

  /**
   * Calculate aspect ratio
   */
  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  /**
   * Parse EXIF data
   */
  private parseExif(exifBuffer: Buffer): Record<string, any> {
    // This would use an EXIF parser library
    // Placeholder implementation
    return {
      make: 'Unknown',
      model: 'Unknown',
      dateTime: new Date().toISOString(),
    };
  }

  /**
   * Generate hash for blurhash
   */
  private generateHash(buffer: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(buffer)
      .digest('base64')
      .substring(0, 30);
  }
}