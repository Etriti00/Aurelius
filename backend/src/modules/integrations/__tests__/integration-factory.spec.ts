import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { IntegrationFactory } from '../base/integration-factory'
import { IntegrationError } from '../common/integration.error'

describe('IntegrationFactory', () => {
  let factory: IntegrationFactory
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_CLIENT_SECRET: 'test-google-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost/auth/google/callback',
        MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-microsoft-secret',
        MICROSOFT_REDIRECT_URI: 'http://localhost/auth/microsoft/callback',
        SLACK_CLIENT_ID: 'test-slack-client-id',
        SLACK_CLIENT_SECRET: 'test-slack-secret',
        SLACK_REDIRECT_URI: 'http://localhost/auth/slack/callback',
      },
      return config[key]
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({,
      providers: [
        IntegrationFactory,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()
}
  }

    factory = module.get<IntegrationFactory>(IntegrationFactory)
    configService = module.get<ConfigService>(ConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createIntegration', () => {
    it('should create Google Workspace integration', async () => {
      const _integration = await factory.createIntegration(
        'google',
        'user-123',
        'access-token',
        'refresh-token',
      )
  }
    }

      expect(integration).toBeDefined()
      expect(integration.provider).toBe('google')
      expect(integration.name).toBe('Google Workspace')
    })

    it('should create Microsoft 365 integration', async () => {
      const _integration = await factory.createIntegration(
        'microsoft',
        'user-123',
        'access-token',
        'refresh-token',
      )
    }

      expect(integration).toBeDefined()
      expect(integration.provider).toBe('microsoft')
      expect(integration.name).toBe('Microsoft 365')
    })

    it('should create Slack integration', async () => {
      const _integration = await factory.createIntegration('slack', 'user-123', 'access-token')
    }

      expect(integration).toBeDefined()
      expect(integration.provider).toBe('slack')
      expect(integration.name).toBe('Slack')
    })

    it('should throw error for unsupported provider', async () => {
      await expect(
        factory.createIntegration('unsupported' as any, 'user-123', 'access-token'),
      ).rejects.toThrow(IntegrationError)
    })
  })

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = factory.getSupportedProviders()
  }
    }

      expect(providers).toContain('google')
      expect(providers).toContain('microsoft')
      expect(providers).toContain('slack')
      expect(providers).toContain('github')
      expect(providers).toContain('notion')
      expect(providers.length).toBeGreaterThan(5)
    })
  })

  describe('getProviderConfig', () => {
    it('should return valid config for Google', () => {
      const config = factory.getProviderConfig('google')
  }
    }

      expect(config.clientId).toBe('test-google-client-id')
      expect(config.clientSecret).toBe('test-google-secret')
      expect(config.redirectUri).toBe('http://localhost/auth/google/callback')
      expect(config.scopes).toContain('https://www.googleapis.com/auth/gmail.readonly')
      expect(config.apiBaseUrl).toBe('https://www.googleapis.com')
    })

    it('should return valid config for Microsoft', () => {
      const config = factory.getProviderConfig('microsoft')
    }

      expect(config.clientId).toBe('test-microsoft-client-id')
      expect(config.clientSecret).toBe('test-microsoft-secret')
      expect(config.redirectUri).toBe('http://localhost/auth/microsoft/callback')
      expect(config.scopes).toContain('https://graph.microsoft.com/Mail.ReadWrite')
      expect(config.apiBaseUrl).toBe('https://graph.microsoft.com/v1.0')
    })

    it('should return valid config for Slack', () => {
      const config = factory.getProviderConfig('slack')
    }

      expect(config.clientId).toBe('test-slack-client-id')
      expect(config.clientSecret).toBe('test-slack-secret')
      expect(config.redirectUri).toBe('http://localhost/auth/slack/callback')
      expect(config.scopes).toContain('channels:read')
      expect(config.apiBaseUrl).toBe('https://slack.com/api')
    })

    it('should throw error for unknown provider', () => {
      expect(() => factory.getProviderConfig('unknown' as any)).toThrow(IntegrationError)
    })
  })

  describe('validateProviderConfig', () => {
    it('should validate Google config successfully', () => {
      const isValid = factory.validateProviderConfig('google')
      expect(isValid).toBe(true)
    })
  }

    it('should validate Microsoft config successfully', () => {
      const isValid = factory.validateProviderConfig('microsoft')
      expect(isValid).toBe(true)
    })

    it('should validate Slack config successfully', () => {
      const isValid = factory.validateProviderConfig('slack')
      expect(isValid).toBe(true)
    })

    it('should return false for missing config', () => {
      mockConfigService.get.mockReturnValue(undefined)
    }

      const isValid = factory.validateProviderConfig('google')
      expect(isValid).toBe(false)
    })
  })
})
