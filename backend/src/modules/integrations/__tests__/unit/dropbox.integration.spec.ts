import { DropboxIntegration } from '../../dropbox/dropbox.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('DropboxIntegration', () => {
  let integration: DropboxIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(DropboxIntegration, 'dropbox')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Dropbox API
    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.dropbox.com/oauth2/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
        scope: 'account_info.read files.metadata.read files.content.read',
        uid: '12345678',
        account_id: 'dbid:AAAA1234567890'}),
      'POST https://api.dropboxapi.com/2/users/get_current_account':
        IntegrationTestHelper.createMockApiResponse({
          account_id: 'dbid:AAAA1234567890',
          name: {,
            given_name: 'John',
            surname: 'Doe',
            familiar_name: 'John',
            display_name: 'John Doe',
            abbreviated_name: 'JD'},
          email: 'john.doe@example.com',
          email_verified: true,
          profile_photo_url: 'https://example.com/photo.jpg',
          disabled: false,
          country: 'US',
          locale: 'en',
          referral_link: 'https://db.tt/example',
          is_paired: true,
          account_type: {,
            tag: 'pro'},
          root_info: {,
            tag: 'user',
            root_namespace_id: 'ns_12345',
            home_namespace_id: 'ns_12345'}),
      'POST https://api.dropboxapi.com/2/users/get_space_usage':
        IntegrationTestHelper.createMockApiResponse({
          used: 5368709120,
          allocation: {,
            tag: 'individual',
            allocated: 107374182400}),
      'POST https://api.dropboxapi.com/2/files/list_folder':
        IntegrationTestHelper.createMockApiResponse({
          entries: [
            {
              tag: 'file',
              name: 'test-document.pdf',
              path_lower: '/test-document.pdf',
              path_display: '/test-document.pdf',
              id: 'id:AAAA1234567890',
              client_modified: '2024-01-01T12:00:00Z',
              server_modified: '2024-01-01T12:00:00Z',
              rev: '5e2b0a123456789',
              size: 1024768,
              content_hash: 'abcd1234567890',
              has_explicit_shared_members: false},
            {
              tag: 'folder',
              name: 'My Folder',
              path_lower: '/my folder',
              path_display: '/My Folder',
              id: 'id:BBBB0987654321'},
          ],
          cursor: 'ZtkX9_EHj3x7PMkVuFIhwKYXEpwpLwyxp9vMKomUhllil9q7eWiAu',
          has_more: false}),
      'POST https://api.dropboxapi.com/2/files/get_metadata':
        IntegrationTestHelper.createMockApiResponse({
          tag: 'file',
          name: 'test-document.pdf',
          path_lower: '/test-document.pdf',
          path_display: '/test-document.pdf',
          id: 'id:AAAA1234567890',
          client_modified: '2024-01-01T12:00:00Z',
          server_modified: '2024-01-01T12:00:00Z',
          rev: '5e2b0a123456789',
          size: 1024768,
          content_hash: 'abcd1234567890',
          has_explicit_shared_members: false}),
      'POST https://api.dropboxapi.com/2/files/search_v2':
        IntegrationTestHelper.createMockApiResponse({
          matches: [
            {
              match_type: { tag: 'filename' },
              metadata: {,
                tag: 'file',
                name: 'search-result.txt',
                path_lower: '/search-result.txt',
                path_display: '/search-result.txt',
                id: 'id:CCCC1111222233',
                client_modified: '2024-01-01T12:00:00Z',
                server_modified: '2024-01-01T12:00:00Z',
                rev: '5e2b0a987654321',
                size: 2048,
                content_hash: 'efgh5678901234'},
          ],
          start: 0,
          has_more: false}),
      'POST https://api.dropboxapi.com/2/sharing/get_shared_links':
        IntegrationTestHelper.createMockApiResponse({
          links: [
            {
              tag: 'file',
              url: 'https://www.dropbox.com/s/example123/test.txt?dl=0',
              name: 'test.txt',
              link_permissions: {,
                can_revoke: true,
                resolved_visibility: { tag: 'public' },
              expires: null,
              path_lower: '/test.txt'},
          ]}),
      'POST https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings':
        IntegrationTestHelper.createMockApiResponse({
          tag: 'file',
          url: 'https://www.dropbox.com/s/newlink456/document.pdf?dl=0',
          name: 'document.pdf',
          link_permissions: {,
            can_revoke: true,
            resolved_visibility: { tag: 'public' },
          expires: null,
          path_lower: '/document.pdf'}),
      'POST https://content.dropboxapi.com/2/files/download': new Response(new ArrayBuffer(1024), {
        status: 200,
        headers: {
          'dropbox-api-result': JSON.stringify({
            name: 'test-file.txt',
            path_lower: '/test-file.txt',
            path_display: '/test-file.txt',
            id: 'id:DDDD4444555566',
            client_modified: '2024-01-01T12:00:00Z',
            server_modified: '2024-01-01T12:00:00Z',
            rev: '5e2b0a111111111',
            size: 1024})}),
      'POST https://content.dropboxapi.com/2/files/upload':
        IntegrationTestHelper.createMockApiResponse({
          name: 'uploaded-file.txt',
          path_lower: '/uploaded-file.txt',
          path_display: '/uploaded-file.txt',
          id: 'id:EEEE7777888899',
          client_modified: '2024-01-01T12:00:00Z',
          server_modified: '2024-01-01T12:00:00Z',
          rev: '5e2b0a222222222',
          size: 512,
          content_hash: 'ijkl9012345678'}),
      'POST https://api.dropboxapi.com/2/files/create_folder_v2':
        IntegrationTestHelper.createMockApiResponse({
          metadata: {,
            tag: 'folder',
            name: 'New Folder',
            path_lower: '/new folder',
            path_display: '/New Folder',
            id: 'id:FFFF0000111122'}),
      'POST https://api.dropboxapi.com/2/files/delete_v2':
        IntegrationTestHelper.createMockApiResponse({
          metadata: {,
            tag: 'deleted',
            name: 'deleted-file.txt',
            path_lower: '/deleted-file.txt',
            path_display: '/deleted-file.txt'}),
      'POST https://api.dropboxapi.com/2/files/move_v2':
        IntegrationTestHelper.createMockApiResponse({
          metadata: {,
            tag: 'file',
            name: 'moved-file.txt',
            path_lower: '/new-location/moved-file.txt',
            path_display: '/New Location/moved-file.txt',
            id: 'id:GGGG3333444455',
            client_modified: '2024-01-01T12:00:00Z',
            server_modified: '2024-01-01T12:00:00Z',
            rev: '5e2b0a333333333',
            size: 256}),
      'POST https://api.dropboxapi.com/2/files/copy_v2':
        IntegrationTestHelper.createMockApiResponse({
          metadata: {,
            tag: 'file',
            name: 'copied-file.txt',
            path_lower: '/copy-location/copied-file.txt',
            path_display: '/Copy Location/copied-file.txt',
            id: 'id:HHHH6666777788',
            client_modified: '2024-01-01T12:00:00Z',
            server_modified: '2024-01-01T12:00:00Z',
            rev: '5e2b0a444444444',
            size: 256}),
      'POST https://api.dropboxapi.com/2/team/get_info':
        IntegrationTestHelper.createMockApiResponse({
          name: 'Aurelius Team',
          team_id: 'dbtid:AAAA1234567890',
          num_licensed_users: 10,
          num_provisioned_users: 8,
          policies: {,
            sharing: {
              shared_folder_member_policy: { tag: 'team_only' },
              shared_folder_join_policy: { tag: 'from_team_only' },
              shared_link_create_policy: { tag: 'team_only' },
            emm_state: { tag: 'disabled' },
            office_addin: { tag: 'disabled' }),
      'POST https://api.dropboxapi.com/2/paper/docs/list':
        IntegrationTestHelper.createMockApiResponse({
          doc_ids: ['doc123', 'doc456'],
          docs: {,
            doc123: {
              title: 'Meeting Notes',
              status: { tag: 'active' },
              created_date: '2024-01-01T12:00:00Z',
              last_updated_date: '2024-01-02T12:00:00Z',
              last_editor: {,
                account_id: 'dbid:AAAA1234567890',
                display_name: 'John Doe',
                email: 'john.doe@example.com'},
            doc456: {,
              title: 'Project Plan',
              status: { tag: 'active' },
              created_date: '2024-01-01T12:00:00Z',
              last_updated_date: '2024-01-03T12:00:00Z',
              last_editor: {,
                account_id: 'dbid:BBBB0987654321',
                display_name: 'Jane Smith',
                email: 'jane.smith@example.com'}),
      'POST https://api.dropboxapi.com/2/paper/docs/download': new Response(
        '# Meeting Notes\n\nThis is a test Paper document.',
        {
          status: 200,
          headers: {
            'dropbox-api-result': JSON.stringify({
              doc_id: 'doc123',
              title: 'Meeting Notes'})},
      )})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        code: 'mock_code',
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3000/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600,
        userId: 'dbid:AAAA1234567890',
        userInfo: {,
          id: 'dbid:AAAA1234567890',
          name: 'John Doe',
          email: 'john.doe@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'mock_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(401, 'Invalid authorization code'),
        ),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        code: 'invalid_code'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'dbid:AAAA1234567890',
        name: 'John Doe',
        email: 'john.doe@example.com'})
      expect(status.lastSync).toBeDefined()
    })

    it('should return disconnected status when authentication fails', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockRejectedValue(new Error('Token not found'))
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(false)
      expect(status.error).toBeDefined()
    })
  })

  describe('Sync Operations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        files: expect.arrayContaining([
          expect.objectContaining({
            tag: 'file',
            name: 'test-document.pdf',
            id: 'id:AAAA1234567890'}),
        ]),
        account: expect.objectContaining({,
          account_id: 'dbid:AAAA1234567890',
          name: expect.objectContaining({,
            display_name: 'John Doe'})}),
        spaceUsage: expect.objectContaining({,
          used: 5368709120,
          allocation: expect.objectContaining({,
            tag: 'individual'})}),
        syncedAt: expect.any(String)})
    })

    it('should handle partial sync failures gracefully', async () => {
      fetchMock.mockImplementationOnce(url => {
        if (url.includes('/files/list_folder')) {
          return Promise.resolve(IntegrationTestHelper.createMockErrorResponse(500, 'Server error'))
        }
        return Promise.resolve(IntegrationTestHelper.createMockApiResponse({}))
      })
    }

      const config = IntegrationTestHelper.createMockConfig()

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data.errors).toBeDefined()
    })
  })

  describe('File Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should list folder contents successfully', async () => {
      const result = await integration.listFolder('/')
    }

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0]).toMatchObject({
        tag: 'file',
        name: 'test-document.pdf'})
      expect(result.entries[1]).toMatchObject({
        tag: 'folder',
        name: 'My Folder'})
      expect(result.has_more).toBe(false)
      expect(result.cursor).toBeDefined()
    })

    it('should get file metadata successfully', async () => {
      const metadata = await integration.getMetadata('/test-document.pdf')
    }

      expect(metadata).toMatchObject({
        tag: 'file',
        name: 'test-document.pdf',
        id: 'id:AAAA1234567890',
        size: 1024768})
    })

    it('should download files successfully', async () => {
      const content = await integration.downloadFile('/test-file.txt')
    }

      expect(content).toBeInstanceOf(ArrayBuffer)
      expect(content.byteLength).toBeGreaterThan(0)
    })

    it('should upload files successfully', async () => {
      const content = 'Test file content'
      const metadata = await integration.uploadFile('/uploaded-file.txt', content)
    }

      expect(metadata).toMatchObject({
        name: 'uploaded-file.txt',
        id: 'id:EEEE7777888899',
        size: 512})
    })

    it('should create folders successfully', async () => {
      const metadata = await integration.createFolder('/New Folder')
    }

      expect(metadata).toMatchObject({
        tag: 'folder',
        name: 'New Folder',
        id: 'id:FFFF0000111122'})
    })

    it('should delete files successfully', async () => {
      const metadata = await integration.deleteFile('/deleted-file.txt')
    }

      expect(metadata).toMatchObject({
        tag: 'deleted',
        name: 'deleted-file.txt'})
    })

    it('should move files successfully', async () => {
      const metadata = await integration.moveFile(
        '/old-location/file.txt',
        '/new-location/moved-file.txt',
      )
    }

      expect(metadata).toMatchObject({
        tag: 'file',
        name: 'moved-file.txt',
        path_display: '/New Location/moved-file.txt'})
    })

    it('should copy files successfully', async () => {
      const metadata = await integration.copyFile(
        '/original/file.txt',
        '/copy-location/copied-file.txt',
      )
    }

      expect(metadata).toMatchObject({
        tag: 'file',
        name: 'copied-file.txt',
        path_display: '/Copy Location/copied-file.txt'})
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should search files successfully', async () => {
      const result = await integration.searchFiles('test document')
    }

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]).toMatchObject({
        match_type: { tag: 'filename' },
        metadata: expect.objectContaining({,
          name: 'search-result.txt'})})
      expect(result.has_more).toBe(false)
    })

    it('should search with path restriction', async () => {
      const result = await integration.searchFiles('document', '/specific-folder', 50)
    }

      expect(result.matches).toBeDefined()
      expect(Array.isArray(result.matches)).toBe(true)
    })
  })

  describe('Sharing & Collaboration', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get shared links successfully', async () => {
      const links = await integration.getSharedLinks()
    }

      expect(links).toHaveLength(1)
      expect(links[0]).toMatchObject({
        tag: 'file',
        url: 'https://www.dropbox.com/s/example123/test.txt?dl=0',
        name: 'test.txt'})
    })

    it('should create shared links successfully', async () => {
      const link = await integration.createSharedLink('/document.pdf', {
        requested_visibility: 'public'})
    }

      expect(link).toMatchObject({
        tag: 'file',
        url: 'https://www.dropbox.com/s/newlink456/document.pdf?dl=0',
        name: 'document.pdf'})
    })

    it('should revoke shared links successfully', async () => {
      await expect(
        integration.revokeSharedLink('https://www.dropbox.com/s/example123/test.txt?dl=0'),
      ).resolves.not.toThrow()
    })
  })

  describe('Team Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get team info for business accounts', async () => {
      const teamInfo = await integration.getTeamInfo()
    }

      expect(teamInfo).toMatchObject({
        name: 'Aurelius Team',
        team_id: 'dbtid:AAAA1234567890',
        num_licensed_users: 10,
        num_provisioned_users: 8})
    })
  })

  describe('Paper API', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should list Paper documents successfully', async () => {
      const docs = await integration.listPaperDocs()
    }

      expect(docs).toHaveLength(2)
      expect(docs[0]).toMatchObject({
        doc_id: 'doc123',
        title: 'Meeting Notes',
        status: { tag: 'active' })
      expect(docs[1]).toMatchObject({
        doc_id: 'doc456',
        title: 'Project Plan'})
      }
    })

    it('should download Paper document content', async () => {
      const content = await integration.getPaperDoc('doc123')
    }

      expect(content).toBe('# Meeting Notes\n\nThis is a test Paper document.')
    })
  })

  describe('Space Usage', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get space usage information', async () => {
      const usage = await integration.getSpaceUsage()
    }

      expect(usage).toMatchObject({
        used: 5368709120,
        allocation: {,
          tag: 'individual',
          allocated: 107374182400})
      }
    })
  })

  describe('Webhook Handling', () => {
    it('should process valid webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'x-dropbox-signature': 'valid-signature'},
        body: JSON.stringify({,
          list_folder: {
            accounts: ['dbid:AAAA1234567890']}),
        query: {}
  }
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should reject invalid webhook signatures', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {},
        body: JSON.stringify({,
          list_folder: {
            accounts: ['dbid:AAAA1234567890']}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).rejects.toThrow(
        'Invalid webhook signature',
      )
    })

    it('should handle file request webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'x-dropbox-signature': 'valid-signature'},
        body: JSON.stringify({,
          file_requests: {
            accounts: ['dbid:AAAA1234567890']}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle API rate limiting', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(429, 'Too Many Requests', {
            'retry-after': '60'}),
        ),
      )
  }
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.listFolder()).rejects.toThrow('API request failed')
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.getCurrentAccount()).rejects.toThrow('Network error')
    })

    it('should handle invalid tokens', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Invalid access token')),
      )
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('invalid_token')

      await expect(integration.getCurrentAccount()).rejects.toThrow('API request failed')
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should cache account information', async () => {
      await integration.getCurrentAccount()
    }

      // Second call should use cache
      fetchMock.mockClear()
      await integration.getCurrentAccount()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should cache file and folder metadata', async () => {
      await integration.listFolder('/')
    }

      // Verify cache is populated
      expect(integration['filesCache'].size).toBeGreaterThan(0)
      expect(integration['foldersCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getCurrentAccount()
      await integration.listFolder('/')
    }

      integration.clearCache()

      expect(integration['accountCache']).toBeNull()
      expect(integration['filesCache'].size).toBe(0)
      expect(integration['foldersCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'files',
        'sync',
        'webhooks',
        'search',
        'sharing',
        'collaboration',
        'metadata',
        'analytics',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('dropbox')
      expect(integration.name).toBe('Dropbox')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
