import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EncryptionService } from '../common/encryption.service'
import * as crypto from 'crypto'

describe('EncryptionService', () => {
  let service: EncryptionService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_KEY') {
        return 'test-encryption-key-32-chars-long'
      },
      return undefined
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({,
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()
}
  }

    service = module.get<EncryptionService>(EncryptionService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sensitive-access-token-12345'
  }
    }

      const encrypted = service.encrypt(plaintext)
      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.split(':')).toHaveLength(3) // iv:tag:encrypted format

      const decrypted = service.decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty strings', () => {
      const plaintext = ''
    }

      const encrypted = service.encrypt(plaintext)
      const decrypted = service.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = 'special!@#$%^&*()chars{}'
    }

      const encrypted = service.encrypt(plaintext)
      const decrypted = service.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid encrypted data format', () => {
      expect(() => service.decrypt('invalid-format')).toThrow('Invalid encrypted data format')
    })

    it('should throw error for corrupted encrypted data', () => {
      expect(() => service.decrypt('aaa:bbb:ccc')).toThrow('Decryption failed')
    })
  })

  describe('hash', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test-data'
  }
    }

      const hash1 = service.hash(data)
      const hash2 = service.hash(data)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex length
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.hash('data1')
      const hash2 = service.hash('data2')
    }

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = service.generateToken(16)
  }
    }

      expect(token).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    it('should generate different tokens each time', () => {
      const token1 = service.generateToken()
      const token2 = service.generateToken()
    }

      expect(token1).not.toBe(token2)
    })

    it('should generate default length token', () => {
      const token = service.generateToken()
    }

      expect(token).toHaveLength(64) // 32 bytes = 64 hex chars
    })
  })

  describe('timingSafeEqual', () => {
    it('should return true for identical strings', () => {
      const str = 'test-string'
  }
    }

      expect(service.timingSafeEqual(str, str)).toBe(true)
    })

    it('should return false for different strings', () => {
  }
      expect(service.timingSafeEqual('string1', 'string2')).toBe(false)
    })

    it('should return false for different length strings', () => {
  }
      expect(service.timingSafeEqual('short', 'longer-string')).toBe(false)
    })

    it('should handle invalid input gracefully', () => {
      expect(service.timingSafeEqual(null as any, 'string')).toBe(false)
    })
  })

  describe('validateWebhookSignature', () => {
    it('should validate correct signature', () => {
      const payload = '{"event":"test","data":"value"}'
      const _secret = 'webhook-secret'
      const signature = 'sha256=b8f9a0e8c3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'
  }
    }

      // This would normally be calculated properly, but for testing we'll mock it
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest
          .fn()
          .mockReturnValue('b8f9a0e8c3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'),
      })

      const isValid = service.validateWebhookSignature(payload, signature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const payload = '{"event":"test","data":"value"}'
      const _secret = 'webhook-secret'
      const signature = 'sha256=invalid-signature'
    }

      const isValid = service.validateWebhookSignature(payload, signature, secret)
      expect(isValid).toBe(false)
    })

    it('should handle signature without prefix', () => {
      const payload = '{"event":"test","data":"value"}'
      const _secret = 'webhook-secret'
      const signature = 'b8f9a0e8c3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'
    }

      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest
          .fn()
          .mockReturnValue('b8f9a0e8c3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7'),
      })

      const isValid = service.validateWebhookSignature(payload, signature, secret)
      expect(isValid).toBe(true)
    })
  })

  describe('constructor error handling', () => {
    it('should throw error when ENCRYPTION_KEY is missing', () => {
      const badConfigService = { get: jest.fn().mockReturnValue(undefined) }
  }
    }

      expect(() => {
        new EncryptionService(badConfigService as any)
      }).toThrow('ENCRYPTION_KEY is required but not provided')
    })
  })
})
