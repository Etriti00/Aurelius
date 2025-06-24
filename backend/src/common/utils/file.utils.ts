import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// Export writeFile for use in other modules
export { writeFile };

export class FileUtils {
  /**
   * Ensure directory exists
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await stat(dirPath);
    } catch (error) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');

    return `${name}-${timestamp}-${random}${ext}`;
  }

  /**
   * Get file extension
   */
  static getExtension(filename: string): string {
    return path.extname(filename).toLowerCase().slice(1);
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = this.getExtension(filename);
    return allowedTypes.includes(ext);
  }

  /**
   * Get MIME type from extension
   */
  static getMimeType(filename: string): string {
    const ext = this.getExtension(filename);
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',

      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',

      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Calculate file hash
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clean filename
   */
  static cleanFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9.\-_]/gi, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Delete file if exists
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
  }> {
    const stats = await stat(filePath);

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
    };
  }
}
