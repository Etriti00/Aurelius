import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly KEY_LENGTH = 32;
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypt text using AES-256-GCM
   */
  static encrypt(text: string, secretKey: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const salt = crypto.randomBytes(this.SALT_LENGTH);

    const key = crypto.pbkdf2Sync(secretKey, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decrypt text using AES-256-GCM
   */
  static decrypt(encryptedText: string, secretKey: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');

    const salt = buffer.subarray(0, this.SALT_LENGTH);
    const iv = buffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const tag = buffer.subarray(
      this.SALT_LENGTH + this.IV_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
    );
    const encrypted = buffer.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);

    const key = crypto.pbkdf2Sync(secretKey, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random string
   */
  static generateSecureString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    const result = new Array(length);

    for (let i = 0; i < length; i++) {
      result[i] = chars[randomBytes[i] % chars.length];
    }

    return result.join('');
  }

  /**
   * Generate API key with prefix
   */
  static generateApiKey(prefix: string = 'aur_', length: number = 32): string {
    return `${prefix}${this.generateSecureString(length)}`;
  }

  /**
   * Hash data using SHA256
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  static generateHmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  static verifyHmac(data: string, secret: string, hmac: string): boolean {
    const expectedHmac = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(hmac));
  }
}
