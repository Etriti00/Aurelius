import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as validator from 'validator';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

@Injectable()
export class SecurityValidationService {
  private readonly maxInputLength: number;
  private readonly allowedDomains: string[];

  constructor(private configService: ConfigService) {
    this.maxInputLength = this.configService.get<number>('MAX_INPUT_LENGTH') || 10000;
    this.allowedDomains = this.configService.get<string>('ALLOWED_DOMAINS')?.split(',') || [];
  }

  /**
   * Validate and sanitize email
   */
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!validator.isEmail(email)) {
      errors.push('Invalid email format');
    } else if (email.length > 255) {
      errors.push('Email is too long');
    }

    // Check if email domain is allowed (if restrictions are configured)
    if (this.allowedDomains.length > 0 && email) {
      const domain = email.split('@')[1];
      if (!this.allowedDomains.includes(domain)) {
        errors.push('Email domain not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: email ? validator.normalizeEmail(email) || email : undefined,
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (password.length > 128) {
        errors.push('Password is too long');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }

      // Check for common passwords
      const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
      if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
        errors.push('Password is too common');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL
   */
  validateUrl(url: string, options?: { protocols?: string[]; requireProtocol?: boolean }): ValidationResult {
    const errors: string[] = [];

    if (!url) {
      errors.push('URL is required');
    } else {
      const validatorOptions = {
        protocols: options?.protocols || ['http', 'https'],
        require_protocol: options?.requireProtocol ?? true,
        require_valid_protocol: true,
        require_host: true,
        require_port: false,
        allow_protocol_relative_urls: false,
      };

      if (!validator.isURL(url, validatorOptions)) {
        errors.push('Invalid URL format');
      }

      // Additional security checks
      if (url.includes('javascript:') || url.includes('data:')) {
        errors.push('URL contains potentially dangerous protocol');
      }

      // Check for SSRF attempts
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
        /172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}/,
        /192\.168\.\d{1,3}\.\d{1,3}/,
        /169\.254\.\d{1,3}\.\d{1,3}/,
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        errors.push('URL points to internal network');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML input
   */
  sanitizeHtml(html: string): string {
    // Remove all HTML tags by default
    let sanitized = html.replace(/<[^>]*>?/gm, '');

    // Additional sanitization
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');

    return sanitized.trim();
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: {
    mimetype: string;
    size: number;
    originalname: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push('File type not allowed');
    }

    // Max file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'app', 'vbs', 'js'];
    if (extension && dangerousExtensions.includes(extension)) {
      errors.push('File extension not allowed');
    }

    // Check for double extensions
    if (file.originalname.split('.').length > 2) {
      errors.push('Files with multiple extensions are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): ValidationResult {
    const errors: string[] = [];

    if (!apiKey) {
      errors.push('API key is required');
    } else {
      if (apiKey.length < 32) {
        errors.push('API key is too short');
      }
      if (apiKey.length > 256) {
        errors.push('API key is too long');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
        errors.push('API key contains invalid characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate JSON input
   */
  validateJson(jsonString: string, maxDepth: number = 10): ValidationResult {
    const errors: string[] = [];

    if (!jsonString) {
      errors.push('JSON is required');
    } else {
      try {
        const parsed = JSON.parse(jsonString);
        
        // Check depth to prevent deeply nested objects
        const depth = this.getObjectDepth(parsed);
        if (depth > maxDepth) {
          errors.push(`JSON depth exceeds maximum of ${maxDepth}`);
        }

        // Check size
        if (jsonString.length > this.maxInputLength) {
          errors.push(`JSON exceeds maximum length of ${this.maxInputLength}`);
        }
      } catch (error) {
        errors.push('Invalid JSON format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate SQL injection attempts
   */
  detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\|\|)|(\*)|(\+)|(%))/, // Common SQL injection characters
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/i,
      /\b(and|or)\b.*\b(=|<|>|<=|>=|<>|!=)/i,
      /\b(xp_|sp_|0x)\w+/i,
      /\b(admin|root|sa)\b.*\b(--|#|\/*)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate NoSQL injection attempts
   */
  detectNoSqlInjection(input: any): boolean {
    if (typeof input === 'string') {
      const noSqlPatterns = [
        /\$\w+/, // MongoDB operators
        /\{\s*["']?\$\w+["']?\s*:/, // MongoDB query operators
        /\b(\$where|\$regex|\$ne|\$gt|\$lt|\$gte|\$lte)\b/,
      ];

      return noSqlPatterns.some(pattern => pattern.test(input));
    }

    if (typeof input === 'object' && input !== null) {
      // Check for operator keys in objects
      const keys = Object.keys(input);
      return keys.some(key => key.startsWith('$'));
    }

    return false;
  }

  /**
   * Validate XSS attempts
   */
  detectXss(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*onerror\s*=/gi,
      /<svg[^>]*onload\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate input length
   */
  validateLength(input: string, min: number, max: number): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      errors.push('Input is required');
    } else {
      if (input.length < min) {
        errors.push(`Input must be at least ${min} characters`);
      }
      if (input.length > max) {
        errors.push(`Input must not exceed ${max} characters`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate CSRF token
   */
  generateCsrfToken(): string {
    return validator.escape(require('crypto').randomBytes(32).toString('hex'));
  }

  /**
   * Validate CSRF token
   */
  validateCsrfToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }

    // Use timing-safe comparison
    return require('crypto').timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken),
    );
  }

  /**
   * Get object depth
   */
  private getObjectDepth(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }

    let maxDepth = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key]) + 1;
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * Validate and sanitize user input
   */
  validateUserInput(input: string, type: 'text' | 'search' | 'name' | 'message'): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Common validation
    if (!input) {
      errors.push('Input is required');
      return { isValid: false, errors };
    }

    // Check for injection attempts
    if (this.detectSqlInjection(input) || this.detectXss(input)) {
      errors.push('Input contains potentially dangerous content');
    }

    // Type-specific validation
    switch (type) {
      case 'text':
        if (input.length > 1000) {
          errors.push('Text is too long');
        }
        sanitized = validator.escape(input);
        break;

      case 'search':
        if (input.length > 100) {
          errors.push('Search query is too long');
        }
        // Remove special characters that might break search
        sanitized = input.replace(/[^\w\s-]/g, ' ').trim();
        break;

      case 'name':
        if (input.length > 50) {
          errors.push('Name is too long');
        }
        if (!/^[a-zA-Z\s'-]+$/.test(input)) {
          errors.push('Name contains invalid characters');
        }
        sanitized = validator.escape(input.trim());
        break;

      case 'message':
        if (input.length > 5000) {
          errors.push('Message is too long');
        }
        sanitized = this.sanitizeHtml(input);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }
}