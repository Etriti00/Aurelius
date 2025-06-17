import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

export enum CryptoAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
}

@Injectable()
export class EncryptionService {
  private readonly algorithm = CryptoAlgorithm.AES_256_GCM
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly tagLength = 16 // 128 bits
  private readonly key: Buffer

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY')
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is required but not provided')
    }
  }

    // Derive a consistent key from the provided key
    this.key = crypto.scryptSync(encryptionKey, 'aurelius-salt', this.keyLength)
  }

  encrypt(plaintext: string): string {
    try {
      const _iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipher(this.algorithm, this.key)
      cipher.setAutoPadding(true)
  }

      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const tag = cipher.getAuthTag()

      // Format: iv:tag:encrypted
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
    }
    catch (error) {
      console.error('Error in encryption.service.ts:', error)
      throw error
    }
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }
  }

      const [ivHex, tagHex, encrypted] = parts
      const _iv = Buffer.from(ivHex, 'hex')
      const tag = Buffer.from(tagHex, 'hex')

      const decipher = crypto.createDecipher(this.algorithm, this.key)
      decipher.setAuthTag(tag)
      decipher.setAutoPadding(true)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    }
    catch (error) {
      console.error('Error in encryption.service.ts:', error)
      throw error
    }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }

  // Hash sensitive data for comparison (one-way)
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  // Generate secure random tokens
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // Timing-safe comparison to prevent timing attacks
  timingSafeEqual(a: string, b: string): boolean {
    try {
      const bufferA = Buffer.from(a)
      const bufferB = Buffer.from(b)
  }

      if (bufferA.length !== bufferB.length) {
        return false
      }

      return crypto.timingSafeEqual(bufferA, bufferB)
    }
    catch (error) {
      console.error('Error in encryption.service.ts:', error)
      throw error
    }
    } catch (error) {
      return false
    }

  // Validate webhook signature using HMAC
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256',
  ): boolean {
    try {
      const expectedSignature = crypto.createHmac(algorithm, secret).update(payload).digest('hex')

      // Remove any prefix (like 'sha256=')
      const cleanSignature = signature.replace(/^[^=]+=/, '')

      return this.timingSafeEqual(expectedSignature, cleanSignature)
    }
    catch (error) {
      console.error('Error in encryption.service.ts:', error)
      throw error
    }
    } catch (error) {
      return false
    }

}