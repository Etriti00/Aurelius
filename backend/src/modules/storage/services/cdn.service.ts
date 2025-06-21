import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { CacheService } from '../../cache/services/cache.service';
import { ImageTransformOptions } from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import * as crypto from 'crypto';

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);
  private readonly cdnBaseUrl: string;
  private readonly cdnSecret: string;
  private readonly cdnEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    const baseUrl = this.configService.getOptional<string>('CDN_BASE_URL');
    const secret = this.configService.getOptional<string>('CDN_SECRET');
    const enabled = this.configService.getOptional<boolean>('CDN_ENABLED');
    
    this.cdnBaseUrl = baseUrl !== undefined ? baseUrl : 'https://cdn.aurelius.ai';
    this.cdnSecret = secret !== undefined ? secret : '';
    this.cdnEnabled = enabled !== undefined ? enabled : false;
  }

  /**
   * Generate CDN URL for a file
   */
  getCdnUrl(key: string): string {
    if (!this.cdnEnabled) {
      return key;
    }

    return `${this.cdnBaseUrl}/${key}`;
  }

  /**
   * Generate CDN URL with image transformations
   */
  getImageUrl(key: string, options: ImageTransformOptions = {}): string {
    if (!this.cdnEnabled) {
      return key;
    }

    const params = this.buildImageParams(options);
    const signature = this.generateSignature(key, params);
    
    const url = new URL(`${this.cdnBaseUrl}/${key}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    if (this.cdnSecret) {
      url.searchParams.append('signature', signature);
    }

    return url.toString();
  }

  /**
   * Purge CDN cache for specific keys
   */
  async purgeCache(keys: string[]): Promise<void> {
    try {
      if (!this.cdnEnabled) {
        return;
      }

      // Implementation depends on CDN provider (CloudFront, Cloudflare, etc.)
      // This is a placeholder for the actual implementation
      const purgeUrl = `${this.cdnBaseUrl}/api/purge`;
      const response = await fetch(purgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.cdnSecret}`,
        },
        body: JSON.stringify({ keys }),
      });

      if (!response.ok) {
        throw new Error(`CDN purge failed: ${response.statusText}`);
      }

      // Clear local cache as well
      for (const key of keys) {
        await this.cacheService.del(`cdn:${key}`);
      }

      this.logger.log(`Purged CDN cache for ${keys.length} keys`);
    } catch (error: any) {
      this.logger.error(`Failed to purge CDN cache: ${error.message}`);
      throw new BusinessException(
        'Failed to purge CDN cache',
        'CDN_PURGE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Warm CDN cache by pre-loading URLs
   */
  async warmCache(urls: string[]): Promise<void> {
    try {
      if (!this.cdnEnabled) {
        return;
      }

      const warmPromises = urls.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          return { url, success: response.ok };
        } catch (error) {
          return { url, success: false };
        }
      });

      const results = await Promise.all(warmPromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        this.logger.warn(`Failed to warm ${failed.length} URLs`);
      }

      this.logger.log(`Warmed CDN cache for ${urls.length} URLs`);
    } catch (error: any) {
      this.logger.error(`Failed to warm CDN cache: ${error.message}`);
      // Don't throw, warming is best-effort
    }
  }

  /**
   * Generate signed URL for secure content
   */
  generateSignedUrl(key: string, expiresIn: number = 3600): string {
    if (!this.cdnEnabled || !this.cdnSecret) {
      return this.getCdnUrl(key);
    }

    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const path = `/${key}`;
    const auth = this.generateAuthToken(path, expires);

    const url = new URL(`${this.cdnBaseUrl}${path}`);
    url.searchParams.append('expires', expires.toString());
    url.searchParams.append('auth', auth);

    return url.toString();
  }

  /**
   * Build image transformation parameters
   */
  private buildImageParams(options: ImageTransformOptions): Record<string, any> {
    const params: Record<string, any> = {};

    if (options.width) params.w = options.width;
    if (options.height) params.h = options.height;
    if (options.quality) params.q = options.quality;
    if (options.format) params.f = options.format;
    if (options.fit) params.fit = options.fit;
    if (options.blur) params.blur = options.blur;
    if (options.sharpen) params.sharpen = options.sharpen ? 1 : 0;
    if (options.grayscale) params.grayscale = options.grayscale ? 1 : 0;
    if (options.rotate) params.rotate = options.rotate;

    return params;
  }

  /**
   * Generate signature for image transformations
   */
  private generateSignature(key: string, params: Record<string, any>): string {
    if (!this.cdnSecret) {
      return '';
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const message = `${key}?${sortedParams}`;
    return crypto
      .createHmac('sha256', this.cdnSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * Generate auth token for signed URLs
   */
  private generateAuthToken(path: string, expires: number): string {
    const message = `${path}:${expires}`;
    return crypto
      .createHmac('sha256', this.cdnSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * Get CDN statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    bandwidth: number;
    requests: number;
  }> {
    // This would connect to your CDN provider's API
    // Placeholder implementation
    return {
      hits: 0,
      misses: 0,
      bandwidth: 0,
      requests: 0,
    };
  }

  /**
   * Check if CDN is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.cdnEnabled) {
        return true;
      }

      const testUrl = `${this.cdnBaseUrl}/health`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('CDN health check failed:', error);
      return false;
    }
  }
}