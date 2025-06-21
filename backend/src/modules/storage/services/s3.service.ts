import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import {
  StorageFile,
  UploadOptions,
  SignedUrlOptions,
  StorageListOptions,
  StorageListResult,
  StorageProvider,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements StorageProvider {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    const awsRegion = this.configService.getOptional<string>('AWS_REGION');
    this.region = awsRegion !== undefined ? awsRegion : 'us-east-1';
    
    const s3Bucket = this.configService.getOptional<string>('AWS_S3_BUCKET');
    this.defaultBucket = s3Bucket !== undefined ? s3Bucket : 'aurelius-storage';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(
    buffer: Buffer,
    key: string,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    try {
      const bucket = options.bucket || this.defaultBucket;
      const finalKey = this.buildKey(key, options);
      const contentType = options.contentType || mime.lookup(key) || 'application/octet-stream';

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: options.cacheControl || 'max-age=31536000',
        Metadata: {
          ...options.metadata,
          uploadedAt: new Date().toISOString(),
        },
        ...(options.tags && { Tagging: this.buildTagString(options.tags) }),
        ...(options.expires && { Expires: options.expires }),
        ...(options.public && { ACL: 'public-read' }),
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(bucket, finalKey);

      return {
        id: uuidv4(),
        filename: key.split('/').pop() || key,
        originalName: key,
        mimeType: contentType,
        size: buffer.length,
        url,
        bucket,
        key: finalKey,
        metadata: options.metadata,
        uploadedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new BusinessException(
        'Failed to upload file',
        'STORAGE_UPLOAD_FAILED',
        undefined,
        error,
      );
    }
  }

  async uploadStream(
    stream: Readable,
    key: string,
    options: UploadOptions = {},
  ): Promise<StorageFile> {
    try {
      const bucket = options.bucket || this.defaultBucket;
      const finalKey = this.buildKey(key, options);
      const contentType = options.contentType || mime.lookup(key) || 'application/octet-stream';

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucket,
          Key: finalKey,
          Body: stream,
          ContentType: contentType,
          CacheControl: options.cacheControl || 'max-age=31536000',
          Metadata: {
            ...options.metadata,
            uploadedAt: new Date().toISOString(),
          },
          ...(options.tags && { Tagging: this.buildTagString(options.tags) }),
          ...(options.expires && { Expires: options.expires }),
          ...(options.public && { ACL: 'public-read' }),
        },
      });

      await upload.done();
      const url = this.getPublicUrl(bucket, finalKey);

      // Get file size
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: finalKey,
      });
      const headResult = await this.s3Client.send(headCommand);

      return {
        id: uuidv4(),
        filename: key.split('/').pop() || key,
        originalName: key,
        mimeType: contentType,
        size: headResult.ContentLength || 0,
        url,
        bucket,
        key: finalKey,
        metadata: options.metadata,
        uploadedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload stream to S3: ${error.message}`);
      throw new BusinessException(
        'Failed to upload stream',
        'STORAGE_UPLOAD_STREAM_FAILED',
        undefined,
        error,
      );
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
      });

      const response: GetObjectCommandOutput = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error: any) {
      this.logger.error(`Failed to download file from S3: ${error.message}`);
      throw new BusinessException(
        'Failed to download file',
        'STORAGE_DOWNLOAD_FAILED',
        undefined,
        error,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      throw new BusinessException(
        'Failed to delete file',
        'STORAGE_DELETE_FAILED',
        undefined,
        error,
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
        ...(options.responseContentType && {
          ResponseContentType: options.responseContentType,
        }),
        ...(options.responseContentDisposition && {
          ResponseContentDisposition: options.responseContentDisposition,
        }),
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });
    } catch (error: any) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new BusinessException(
        'Failed to generate signed URL',
        'STORAGE_SIGNED_URL_FAILED',
        undefined,
        error,
      );
    }
  }

  async list(options: StorageListOptions = {}): Promise<StorageListResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.defaultBucket,
        Prefix: options.prefix,
        MaxKeys: options.maxKeys || 1000,
        ContinuationToken: options.continuationToken,
        Delimiter: options.delimiter,
      });

      const response = await this.s3Client.send(command);
      
      const files: StorageFile[] = (response.Contents || []).map(item => ({
        id: uuidv4(),
        filename: item.Key?.split('/').pop() || '',
        originalName: item.Key || '',
        mimeType: mime.lookup(item.Key || '') || 'application/octet-stream',
        size: item.Size || 0,
        url: this.getPublicUrl(this.defaultBucket, item.Key || ''),
        bucket: this.defaultBucket,
        key: item.Key || '',
        uploadedAt: item.LastModified || new Date(),
        lastModified: item.LastModified,
      }));

      const folders = (response.CommonPrefixes || [])
        .map(prefix => prefix.Prefix)
        .filter((prefix): prefix is string => !!prefix);

      return {
        files,
        folders,
        continuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error: any) {
      this.logger.error(`Failed to list files from S3: ${error.message}`);
      throw new BusinessException(
        'Failed to list files',
        'STORAGE_LIST_FAILED',
        undefined,
        error,
      );
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.defaultBucket,
        CopySource: `${this.defaultBucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      this.logger.error(`Failed to copy file in S3: ${error.message}`);
      throw new BusinessException(
        'Failed to copy file',
        'STORAGE_COPY_FAILED',
        undefined,
        error,
      );
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.copy(sourceKey, destinationKey);
      await this.delete(sourceKey);
    } catch (error: any) {
      this.logger.error(`Failed to move file in S3: ${error.message}`);
      throw new BusinessException(
        'Failed to move file',
        'STORAGE_MOVE_FAILED',
        undefined,
        error,
      );
    }
  }

  private buildKey(key: string, options: UploadOptions): string {
    const parts: string[] = [];
    
    if (options.folder) {
      parts.push(options.folder.replace(/^\/|\/$/g, ''));
    }
    
    if (options.filename) {
      parts.push(options.filename);
    } else {
      parts.push(key);
    }
    
    return parts.join('/');
  }

  private buildTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private getPublicUrl(bucket: string, key: string): string {
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}