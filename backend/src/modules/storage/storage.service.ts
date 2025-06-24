import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { CdnService } from './services/cdn.service';
import { ImageService } from './services/image.service';
import { JsonValue } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/services/cache.service';
import {
  StorageFile,
  FileMetadata,
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
    private cacheService: CacheService
  ) {}

  /**
   * Upload a file
   */
  async uploadFile(
    userId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string,
    options: UploadOptions = {}
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
          name: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          url: file.url,
          localPath: file.key,
          metadata: this.convertFileMetadataToJson(file.metadata),
        },
      });

      // Generate responsive variants for images
      if (this.isImage(mimeType)) {
        this.generateImageVariantsAsync(file.id, buffer, key);
      }

      // Update CDN URL
      file.cdnUrl = this.cdnService.getCdnUrl(file.key);

      return file;
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BusinessException('Failed to upload file', 'FILE_UPLOAD_FAILED', undefined, error);
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
      filename: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: Number(file.size),
      url: file.url !== null ? file.url : '',
      cdnUrl: file.url !== null ? file.url : '',
      bucket: 'default',
      key: file.localPath !== null ? file.localPath : '',
      metadata: this.convertMetadata(file.metadata),
      uploadedAt: file.uploadedAt,
      lastModified: file.uploadedAt,
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

    // Delete from S3 if localPath exists
    if (file.localPath) {
      await this.s3Service.delete(file.localPath);
    }

    // Delete variants if exist in metadata
    const fileMetadata = this.convertMetadata(file.metadata);
    if (fileMetadata.variants) {
      for (const variantKey of Object.values(fileMetadata.variants)) {
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

    // Purge CDN cache if localPath exists
    if (file.localPath) {
      await this.cdnService.purgeCache([file.localPath]);
    }

    // Clear local cache
    await this.cacheService.del(`file:${fileId}`);
  }

  /**
   * List user files
   */
  async listFiles(userId: string, options: StorageListOptions = {}): Promise<StorageListResult> {
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
        orderBy: { uploadedAt: 'desc' },
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
      filename: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: Number(file.size),
      url: file.url || '',
      cdnUrl: file.url || '',
      bucket: 'default',
      key: file.localPath || '',
      metadata: this.convertMetadata(file.metadata),
      uploadedAt: file.uploadedAt,
      lastModified: file.uploadedAt,
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
    options: SignedUrlOptions = {}
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
  async getImageUrl(fileId: string, options: ImageTransformOptions = {}): Promise<string> {
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
      stats.totalSize += Number(file.size);

      const type = this.getFileType(file.mimeType);
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, size: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].size += Number(file.size);
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
      throw new BusinessException('File too large', 'FILE_TOO_LARGE', HttpStatus.BAD_REQUEST, {
        size: buffer.length,
        maxSize,
      });
    }

    // Check mime type
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new BusinessException(
        'File type not allowed',
        'INVALID_FILE_TYPE',
        HttpStatus.BAD_REQUEST,
        { mimeType }
      );
    }

    // Validate filename
    if (!filename || filename.length > 255) {
      throw new BusinessException('Invalid filename', 'INVALID_FILENAME');
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = this.sanitizeFilename(filename);
    if (sanitizedFilename !== filename) {
      throw new BusinessException(
        'Invalid filename: contains unsafe characters',
        'UNSAFE_FILENAME',
        HttpStatus.BAD_REQUEST,
        { filename }
      );
    }
  }

  /**
   * Generate unique file key
   */
  private generateFileKey(userId: string, filename: string): string {
    // Sanitize filename first
    const safeFilename = this.sanitizeFilename(filename);

    const timestamp = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}-${safeFilename}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);

    const ext = path.extname(safeFilename);
    const name = path.basename(safeFilename, ext);

    // Use sanitized filename parts
    return `users/${userId}/files/${timestamp}-${hash}/${name}${ext}`;
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   */
  private sanitizeFilename(filename: string): string {
    // Remove any directory traversal patterns
    let sanitized = filename.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');

    // Remove any null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove any control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');

    // Ensure filename only contains safe characters
    // Allow: alphanumeric, dash, underscore, dot, space
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\. ]/g, '');

    // Ensure it doesn't start with a dot (hidden file)
    if (sanitized.startsWith('.')) {
      sanitized = sanitized.substring(1);
    }

    // Ensure it has a valid length
    if (sanitized.length === 0) {
      sanitized = 'unnamed';
    }

    return sanitized;
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
    fileId: string,
    buffer: Buffer,
    baseKey: string
  ): Promise<void> {
    try {
      const variants = await this.imageService.generateResponsiveVariants(
        buffer,
        baseKey.replace(/\.[^.]+$/, '') // Remove extension
      );

      // Store variants in metadata since variants field doesn't exist in model
      const currentFile = await this.prisma.file.findUnique({
        where: { id: fileId },
        select: { metadata: true },
      });

      const metadataValue = currentFile && currentFile.metadata ? currentFile.metadata : null;
      const existingMetadata = this.convertMetadata(metadataValue);
      const updatedMetadata = {
        ...existingMetadata,
        variants,
      };

      await this.prisma.file.update({
        where: { id: fileId },
        data: { metadata: updatedMetadata },
      });

      // Warm CDN cache
      await this.cdnService.warmCache(Object.values(variants));
    } catch (error) {
      this.logger.error(`Failed to generate image variants: ${error}`);
      // Don't throw, this is a background operation
    }
  }

  /**
   * Convert Prisma JsonValue metadata to FileMetadata interface
   */
  private convertMetadata(jsonValue: JsonValue | null): FileMetadata {
    if (!jsonValue || typeof jsonValue !== 'object' || Array.isArray(jsonValue)) {
      return {};
    }

    const metadata = jsonValue as Record<string, JsonValue>;
    const result: FileMetadata = {};

    if (metadata.tags && Array.isArray(metadata.tags)) {
      result.tags = metadata.tags.filter((tag): tag is string => typeof tag === 'string');
    }

    if (typeof metadata.description === 'string') {
      result.description = metadata.description;
    }

    if (typeof metadata.version === 'string') {
      result.version = metadata.version;
    }

    if (typeof metadata.checksum === 'string') {
      result.checksum = metadata.checksum;
    }

    if (typeof metadata.encoding === 'string') {
      result.encoding = metadata.encoding;
    }

    if (
      metadata.variants &&
      typeof metadata.variants === 'object' &&
      !Array.isArray(metadata.variants)
    ) {
      const variants: Record<string, string> = {};
      const variantsObj = metadata.variants as Record<string, JsonValue>;
      for (const [key, value] of Object.entries(variantsObj)) {
        if (typeof value === 'string') {
          variants[key] = value;
        }
      }
      result.variants = variants;
    }

    if (
      metadata.customProperties &&
      typeof metadata.customProperties === 'object' &&
      !Array.isArray(metadata.customProperties)
    ) {
      const customProperties: Record<string, string | number | boolean> = {};
      const customObj = metadata.customProperties as Record<string, JsonValue>;
      for (const [key, value] of Object.entries(customObj)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          customProperties[key] = value;
        }
      }
      result.customProperties = customProperties;
    }

    return result;
  }

  /**
   * Convert FileMetadata interface to JSON for Prisma storage
   */
  private convertFileMetadataToJson(metadata: FileMetadata | undefined): Record<string, JsonValue> {
    if (!metadata) {
      return {};
    }

    const result: Record<string, JsonValue> = {};

    if (metadata.tags) {
      result.tags = metadata.tags;
    }

    if (metadata.description) {
      result.description = metadata.description;
    }

    if (metadata.version) {
      result.version = metadata.version;
    }

    if (metadata.checksum) {
      result.checksum = metadata.checksum;
    }

    if (metadata.encoding) {
      result.encoding = metadata.encoding;
    }

    if (metadata.variants) {
      result.variants = metadata.variants;
    }

    if (metadata.customProperties) {
      result.customProperties = metadata.customProperties;
    }

    return result;
  }
}
