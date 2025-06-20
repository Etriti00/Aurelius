import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { CdnService } from './services/cdn.service';
import { ImageService } from './services/image.service';
import { CacheService } from '../cache/services/cache.service';
import {
  StorageFile,
  UploadOptions,
  SignedUrlOptions,
  StorageListOptions,
  StorageListResult,
  ImageTransformOptions,
} from './interfaces';
import { BusinessException } from '../../common/exceptions';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private cdnService: CdnService,
    private imageService: ImageService,
    private cacheService: CacheService,
  ) {}

  /**
   * Upload a file
   */
  async uploadFile(
    userId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    try {
      // Validate file
      this.validateFile(filename, buffer, mimeType);

      // Generate unique key
      const key = this.generateFileKey(userId, filename);

      // Process image if applicable
      let processedBuffer = buffer;
      if (this.isImage(mimeType)) {
        const processed = await this.imageService.processImage(buffer, {
          quality: 85,
          format: 'webp',
        });
        processedBuffer = processed.buffer;
      }

      // Upload to S3
      const file = await this.s3Service.upload(processedBuffer, key, {
        ...options,
        contentType: mimeType,
        metadata: {
          ...options.metadata,
          userId,
          originalName: filename,
        },
      });

      // Save to database
      await this.prisma.file.create({
        data: {
          id: file.id,
          userId,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: file.url,
          cdnUrl: this.cdnService.getCdnUrl(file.key),
          bucket: file.bucket,
          key: file.key,
          metadata: file.metadata || {},
        },
      });

      // Generate responsive variants for images
      if (this.isImage(mimeType)) {
        this.generateImageVariantsAsync(userId, file.id, buffer, key);
      }

      // Update CDN URL
      file.cdnUrl = this.cdnService.getCdnUrl(file.key);

      return file;
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BusinessException(
        'Failed to upload file',
        'FILE_UPLOAD_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, userId?: string): Promise<StorageFile | null> {
    const cacheKey = `file:${fileId}`;
    
    // Check cache
    const cached = await this.cacheService.get<StorageFile>(cacheKey);
    if (cached) {
      return cached;
    }

    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        ...(userId && { userId }),
      },
    });

    if (!file) {
      return null;
    }

    const storageFile: StorageFile = {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      cdnUrl: file.cdnUrl || this.cdnService.getCdnUrl(file.key),
      bucket: file.bucket,
      key: file.key,
      metadata: file.metadata as Record<string, any>,
      uploadedAt: file.createdAt,
      lastModified: file.updatedAt,
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, storageFile, 3600);

    return storageFile;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new BusinessException('File not found', 'FILE_NOT_FOUND');
    }

    // Delete from S3
    await this.s3Service.delete(file.key);

    // Delete variants if exist
    if (file.variants) {
      const variants = file.variants as Record<string, string>;
      for (const variantKey of Object.values(variants)) {
        try {
          await this.s3Service.delete(variantKey);
        } catch (error) {
          this.logger.warn(`Failed to delete variant: ${variantKey}`);
        }
      }
    }

    // Delete from database
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    // Purge CDN cache
    await this.cdnService.purgeCache([file.key]);

    // Clear local cache
    await this.cacheService.del(`file:${fileId}`);
  }

  /**
   * List user files
   */
  async listFiles(
    userId: string,
    options: StorageListOptions = {},
  ): Promise<StorageListResult> {
    const limit = options.maxKeys || 20;
    const offset = options.continuationToken 
      ? parseInt(Buffer.from(options.continuationToken, 'base64').toString())
      : 0;

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          userId,
          ...(options.prefix && {
            key: { startsWith: options.prefix },
          }),
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({
        where: {
          userId,
          ...(options.prefix && {
            key: { startsWith: options.prefix },
          }),
        },
      }),
    ]);

    const storageFiles: StorageFile[] = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      cdnUrl: file.cdnUrl || this.cdnService.getCdnUrl(file.key),
      bucket: file.bucket,
      key: file.key,
      metadata: file.metadata as Record<string, any>,
      uploadedAt: file.createdAt,
      lastModified: file.updatedAt,
    }));

    const hasMore = offset + limit < total;
    const nextToken = hasMore
      ? Buffer.from((offset + limit).toString()).toString('base64')
      : undefined;

    return {
      files: storageFiles,
      folders: [], // Not implemented for database storage
      continuationToken: nextToken,
      isTruncated: hasMore,
    };
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(
    fileId: string,
    userId: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    const file = await this.getFile(fileId, userId);
    if (!file) {
      throw new BusinessException('File not found', 'FILE_NOT_FOUND');
    }

    return this.s3Service.getSignedUrl(file.key, options);
  }

  /**
   * Get image URL with transformations
   */
  async getImageUrl(
    fileId: string,
    options: ImageTransformOptions = {},
  ): Promise<string> {
    const file = await this.getFile(fileId);
    if (!file) {
      throw new BusinessException('File not found', 'FILE_NOT_FOUND');
    }

    if (!this.isImage(file.mimeType)) {
      throw new BusinessException('File is not an image', 'NOT_AN_IMAGE');
    }

    return this.cdnService.getImageUrl(file.key, options);
  }

  /**
   * Get file statistics for a user
   */
  async getUserStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    const files = await this.prisma.file.findMany({
      where: { userId },
      select: { mimeType: true, size: true },
    });

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    for (const file of files) {
      stats.totalSize += file.size;
      
      const type = this.getFileType(file.mimeType);
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, size: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].size += file.size;
    }

    return stats;
  }

  /**
   * Validate file
   */
  private validateFile(filename: string, buffer: Buffer, mimeType: string): void {
    // Check file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      throw new BusinessException(
        'File too large',
        'FILE_TOO_LARGE',
        { size: buffer.length, maxSize },
      );
    }

    // Check mime type
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new BusinessException(
        'File type not allowed',
        'INVALID_FILE_TYPE',
        { mimeType },
      );
    }

    // Validate filename
    if (!filename || filename.length > 255) {
      throw new BusinessException(
        'Invalid filename',
        'INVALID_FILENAME',
      );
    }
  }

  /**
   * Generate unique file key
   */
  private generateFileKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(`${userId}-${filename}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    
    return `users/${userId}/files/${timestamp}-${hash}/${name}${ext}`;
  }

  /**
   * Check if file is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get file type category
   */
  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    return 'other';
  }

  /**
   * Generate image variants asynchronously
   */
  private async generateImageVariantsAsync(
    userId: string,
    fileId: string,
    buffer: Buffer,
    baseKey: string,
  ): Promise<void> {
    try {
      const variants = await this.imageService.generateResponsiveVariants(
        buffer,
        baseKey.replace(/\.[^.]+$/, ''), // Remove extension
      );

      await this.prisma.file.update({
        where: { id: fileId },
        data: { variants },
      });

      // Warm CDN cache
      await this.cdnService.warmCache(Object.values(variants));
    } catch (error) {
      this.logger.error(`Failed to generate image variants: ${error}`);
      // Don't throw, this is a background operation
    }
  }
}