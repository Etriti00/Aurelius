import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly pbkdf2Iterations = 100000;
  private readonly masterKey: Buffer;

  constructor(private configService: ConfigService) {
    const masterKeyString = this.configService.get<string>('ENCRYPTION_KEY');
    if (!masterKeyString) {
      throw new Error('ENCRYPTION_KEY is required');
    }

    // Get or generate a unique salt for this instance
    const saltString = this.configService.get<string>('ENCRYPTION_SALT');
    if (!saltString) {
      throw new Error(
        'ENCRYPTION_SALT is required. Generate a unique salt using: openssl rand -hex 32'
      );
    }

    // Ensure the master key is the correct length using the unique salt
    this.masterKey = this.deriveKey(masterKeyString, saltString);
  }

  /**
   * Encrypt data
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // Encrypt data
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine IV + tag + encrypted data
      const combined = Buffer.concat([iv, tag, encrypted]);

      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Encryption failed: ${errorMessage}`);
      throw new BusinessException('Failed to encrypt data', 'ENCRYPTION_FAILED', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Decryption failed: ${errorMessage}`);
      throw new BusinessException('Failed to decrypt data', 'DECRYPTION_FAILED', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Generate salt
      const salt = crypto.randomBytes(this.saltLength);

      // Hash password with PBKDF2
      const hash = await this.pbkdf2(password, salt, this.pbkdf2Iterations, 64);

      // Combine salt + iterations + hash
      const combined = Buffer.concat([
        salt,
        Buffer.from(this.pbkdf2Iterations.toString()),
        Buffer.from(':'),
        hash,
      ]);

      return combined.toString('base64');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password hashing failed: ${errorMessage}`);
      throw new BusinessException('Failed to hash password', 'HASHING_FAILED', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Decode from base64
      const combined = Buffer.from(hash, 'base64');

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const remainder = combined.slice(this.saltLength).toString();
      const [iterationsStr, hashStr] = remainder.split(':');
      const iterations = parseInt(iterationsStr, 10);
      const storedHash = Buffer.from(hashStr, 'utf8');

      // Hash the provided password
      const providedHash = await this.pbkdf2(password, salt, iterations, storedHash.length);

      // Compare hashes
      return crypto.timingSafeEqual(storedHash, providedHash);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password verification failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Generate secure token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID
   */
  generateUuid(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash data with SHA256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  generateHmac(data: string, key?: string): string {
    const hmacKey =
      key || this.configService.get<string>('HMAC_KEY') || this.masterKey.toString('hex');
    return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data: string, hmac: string, key?: string): boolean {
    const expectedHmac = this.generateHmac(data, key);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  }

  /**
   * Encrypt JSON object
   */
  async encryptJson<T>(data: T): Promise<string> {
    const json = JSON.stringify(data);
    return this.encrypt(json);
  }

  /**
   * Decrypt JSON object
   */
  async decryptJson<T>(encryptedData: string): Promise<T> {
    const json = await this.decrypt(encryptedData);
    return JSON.parse(json);
  }

  /**
   * Create data key for field-level encryption
   */
  async createDataKey(): Promise<{ key: string; encryptedKey: string }> {
    // Generate new data key
    const dataKey = crypto.randomBytes(this.keyLength);

    // Encrypt data key with master key
    const encryptedKey = await this.encrypt(dataKey.toString('base64'));

    return {
      key: dataKey.toString('base64'),
      encryptedKey,
    };
  }

  /**
   * Decrypt data key
   */
  async decryptDataKey(encryptedKey: string): Promise<Buffer> {
    const keyBase64 = await this.decrypt(encryptedKey);
    return Buffer.from(keyBase64, 'base64');
  }

  /**
   * Derive key from password
   */
  private deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.pbkdf2Iterations, this.keyLength, 'sha256');
  }

  /**
   * PBKDF2 async wrapper
   */
  private pbkdf2(
    password: string,
    salt: Buffer,
    iterations: number,
    keylen: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keylen, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Sanitize sensitive data for logging
   */
  sanitizeForLogging<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential', 'auth', 'key'];

    if (Array.isArray(data)) {
      return data.map(item =>
        typeof item === 'object' && item !== null ? this.sanitizeForLogging(item) : item
      ) as T;
    }

    const sanitized: Record<string, unknown> = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = (data as Record<string, unknown>)[key];

        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeForLogging(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized as T;
  }
}
