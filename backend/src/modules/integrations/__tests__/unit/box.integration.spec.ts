import { User } from '@prisma/client';
import { BoxIntegration } from '../../box/box.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('BoxIntegration', () => {
  let integration: BoxIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(BoxIntegration, 'box')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.box.com/oauth2/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'box_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'box_refresh_token'}),
      'GET https://api.box.com/2.0/users/me': IntegrationTestHelper.createMockApiResponse({,
        id: '12345',
        type: 'user',
        name: 'John Doe',
        login: 'john@example.com',
        enterprise: {,
          id: '67890',
          name: 'Example Corp'},
        language: 'en',
        timezone: 'America/New_York',
        space_amount: 107374182400,
        space_used: 1073741824,
        max_upload_size: 5368709120,
        status: 'active',
        job_title: 'Developer',
        phone: '+1-555-123-4567',
        address: '123 Main St, San Francisco, CA',
        avatar_url: 'https://example.box.com/api/avatar/john',
        role: 'admin',
        can_see_managed_users: true,
        is_sync_enabled: true,
        is_external_collab_restricted: false,
        is_exempt_from_device_limits: false,
        is_exempt_from_login_verification: false,
        is_platform_access_only: false,
        created_at: '2024-01-01T10:00:00Z',
        modified_at: '2024-01-15T14:30:00Z'}),
      'GET https://api.box.com/2.0/folders/0/items': IntegrationTestHelper.createMockApiResponse({,
        total_count: 3,
        entries: [
          {
            id: '11111',
            type: 'file',
            etag: '1',
            name: 'Document.pdf',
            size: 1024000,
            created_at: '2024-01-10T10:00:00Z',
            modified_at: '2024-01-10T10:30:00Z',
            owned_by: {,
              id: '12345',
              type: 'user',
              name: 'John Doe',
              login: 'john@example.com'},
            shared_link: null,
            permissions: {,
              can_download: true,
              can_preview: true,
              can_upload: false,
              can_comment: true,
              can_rename: true,
              can_delete: true,
              can_share: true,
              can_set_share_access: true,
              can_invite_collaborator: true,
              can_annotate: false,
              can_view_annotations: false},
            path_collection: {,
              total_count: 1,
              entries: [
                {
                  id: '0',
                  type: 'folder',
                  name: 'All Files'},
              ]},
            parent: {,
              id: '0',
              type: 'folder',
              name: 'All Files'},
          {
            id: '22222',
            type: 'folder',
            etag: '2',
            name: 'Projects',
            size: 0,
            created_at: '2024-01-05T10:00:00Z',
            modified_at: '2024-01-12T15:00:00Z',
            owned_by: {,
              id: '12345',
              type: 'user',
              name: 'John Doe',
              login: 'john@example.com'},
            shared_link: {,
              url: 'https://example.box.com/s/shared123',
              download_url: 'https://example.box.com/shared/static/shared123',
              effective_access: 'open',
              effective_permission: 'can_download',
              is_password_enabled: false,
              download_count: 5,
              preview_count: 15,
              access: 'open',
              permissions: {,
                can_download: true,
                can_preview: true,
                can_edit: false},
            permissions: {,
              can_download: true,
              can_upload: true,
              can_rename: true,
              can_delete: true,
              can_share: true,
              can_set_share_access: true,
              can_invite_collaborator: true,
              can_annotate: false,
              can_view_annotations: false},
            path_collection: {,
              total_count: 1,
              entries: [
                {
                  id: '0',
                  type: 'folder',
                  name: 'All Files'},
              ]},
            parent: {,
              id: '0',
              type: 'folder',
              name: 'All Files'},
          {
            id: '33333',
            type: 'file',
            name: 'Presentation.pptx',
            size: 2048000,
            created_at: '2024-01-08T14:00:00Z',
            modified_at: '2024-01-08T14:30:00Z'},
        ],
        offset: 0,
        limit: 100}),
      'GET https://api.box.com/2.0/files/11111': IntegrationTestHelper.createMockApiResponse({,
        id: '11111',
        type: 'file',
        etag: '1',
        name: 'Document.pdf',
        description: 'Important project document',
        size: 1024000,
        created_at: '2024-01-10T10:00:00Z',
        modified_at: '2024-01-10T10:30:00Z',
        owned_by: {,
          id: '12345',
          type: 'user',
          name: 'John Doe',
          login: 'john@example.com'},
        file_version: {,
          id: 'v1',
          type: 'file_version',
          sha1: 'abc123',
          name: 'Document.pdf',
          size: 1024000,
          created_at: '2024-01-10T10:00:00Z',
          modified_at: '2024-01-10T10:30:00Z',
          modified_by: {,
            id: '12345',
            type: 'user',
            name: 'John Doe',
            login: 'john@example.com'},
        representations: {,
          entries: [
            {
              representation: '[pdf]',
              properties: {},
              info: {,
                url: 'https://api.box.com/2.0/internal_files/11111/versions/current/representations/pdf'},
              status: {,
                state: 'success'},
          ]}),
      'POST https://upload.box.com/api/2.0/files/content':
        IntegrationTestHelper.createMockApiResponse({
          total_count: 1,
          entries: [
            {
              id: '44444',
              type: 'file',
              name: 'uploaded-file.txt',
              size: 1024,
              created_at: '2024-01-15T10:00:00Z',
              parent: {,
                id: '0',
                type: 'folder',
                name: 'All Files'},
          ]}),
      'GET https://api.box.com/2.0/files/11111/content': new Response(new ArrayBuffer(1024), {
        status: 200}),
      'DELETE https://api.box.com/2.0/files/11111': new Response('', { status: 204 }),
      'POST https://api.box.com/2.0/files/11111/copy': IntegrationTestHelper.createMockApiResponse({,
        id: '55555',
        type: 'file',
        name: 'Document (Copy).pdf',
        parent: {,
          id: '22222',
          type: 'folder',
          name: 'Projects'}),
      'GET https://api.box.com/2.0/folders/22222': IntegrationTestHelper.createMockApiResponse({,
        id: '22222',
        type: 'folder',
        etag: '2',
        name: 'Projects',
        description: 'Project files and documents',
        size: 5120000,
        created_at: '2024-01-05T10:00:00Z',
        modified_at: '2024-01-12T15:00:00Z',
        owned_by: {,
          id: '12345',
          type: 'user',
          name: 'John Doe',
          login: 'john@example.com'},
        path_collection: {,
          total_count: 1,
          entries: [
            {
              id: '0',
              type: 'folder',
              name: 'All Files'},
          ]},
        parent: {,
          id: '0',
          type: 'folder',
          name: 'All Files'},
        item_collection: {,
          total_count: 2,
          entries: [
            {
              id: '11111',
              type: 'file',
              name: 'Document.pdf'},
            {
              id: '33333',
              type: 'file',
              name: 'Presentation.pptx'},
          ],
          offset: 0,
          limit: 100},
        permissions: {,
          can_download: true,
          can_upload: true,
          can_rename: true,
          can_delete: true,
          can_share: true,
          can_set_share_access: true,
          can_invite_collaborator: true,
          can_annotate: false,
          can_view_annotations: false}),
      'POST https://api.box.com/2.0/folders': IntegrationTestHelper.createMockApiResponse({,
        id: '66666',
        type: 'folder',
        name: 'New Project',
        created_at: '2024-01-15T10:00:00Z',
        parent: {,
          id: '0',
          type: 'folder',
          name: 'All Files'}),
      'DELETE https://api.box.com/2.0/folders/22222': new Response('', { status: 204 }),
      'PUT https://api.box.com/2.0/files/11111': IntegrationTestHelper.createMockApiResponse({,
        id: '11111',
        type: 'file',
        name: 'Document.pdf',
        shared_link: {,
          url: 'https://example.box.com/s/shared456',
          download_url: 'https://example.box.com/shared/static/shared456',
          effective_access: 'open',
          effective_permission: 'can_download',
          is_password_enabled: false,
          download_count: 0,
          preview_count: 0,
          access: 'open',
          permissions: {,
            can_download: true,
            can_preview: true,
            can_edit: false}),
      'GET https://api.box.com/2.0/files/11111/collaborations':
        IntegrationTestHelper.createMockApiResponse({
          total_count: 2,
          entries: [
            {
              id: 'collab1',
              type: 'collaboration',
              created_by: {,
                id: '12345',
                type: 'user',
                name: 'John Doe',
                login: 'john@example.com'},
              created_at: '2024-01-10T10:00:00Z',
              modified_at: '2024-01-10T10:00:00Z',
              status: 'accepted',
              accessible_by: {,
                id: '67890',
                type: 'user',
                name: 'Jane Smith',
                login: 'jane@example.com'},
              role: 'editor',
              acknowledged_at: '2024-01-10T10:05:00Z',
              item: {,
                id: '11111',
                type: 'file',
                name: 'Document.pdf',
                etag: '1'},
              invite_email: 'jane@example.com'},
          ]}),
      'POST https://api.box.com/2.0/collaborations': IntegrationTestHelper.createMockApiResponse({,
        id: 'collab2',
        type: 'collaboration',
        created_by: {,
          id: '12345',
          type: 'user',
          name: 'John Doe',
          login: 'john@example.com'},
        created_at: '2024-01-15T10:00:00Z',
        modified_at: '2024-01-15T10:00:00Z',
        status: 'pending',
        accessible_by: {,
          id: '99999',
          type: 'user',
          name: 'Bob Wilson',
          login: 'bob@example.com'},
        role: 'viewer',
        item: {,
          id: '11111',
          type: 'file',
          name: 'Document.pdf'},
        invite_email: 'bob@example.com'}),
      'GET https://api.box.com/2.0/files/11111/comments':
        IntegrationTestHelper.createMockApiResponse({
          total_count: 1,
          entries: [
            {
              id: 'comment1',
              type: 'comment',
              is_reply_comment: false,
              message: 'This looks great!',
              tagged_message: 'This looks great!',
              created_by: {,
                id: '67890',
                type: 'user',
                name: 'Jane Smith',
                login: 'jane@example.com'},
              created_at: '2024-01-11T10:00:00Z',
              modified_at: '2024-01-11T10:00:00Z',
              item: {,
                id: '11111',
                type: 'file'},
          ]}),
      'POST https://api.box.com/2.0/comments': IntegrationTestHelper.createMockApiResponse({,
        id: 'comment2',
        type: 'comment',
        is_reply_comment: false,
        message: 'Thanks for the feedback!',
        tagged_message: 'Thanks for the feedback!',
        created_by: {,
          id: '12345',
          type: 'user',
          name: 'John Doe',
          login: 'john@example.com'},
        created_at: '2024-01-15T10:00:00Z',
        modified_at: '2024-01-15T10:00:00Z',
        item: {,
          id: '11111',
          type: 'file'}),
      'GET https://api.box.com/2.0/search': IntegrationTestHelper.createMockApiResponse({,
        total_count: 2,
        entries: [
          {
            id: '11111',
            type: 'file',
            name: 'Document.pdf',
            size: 1024000,
            created_at: '2024-01-10T10:00:00Z',
            modified_at: '2024-01-10T10:30:00Z',
            owned_by: {,
              id: '12345',
              type: 'user',
              name: 'John Doe',
              login: 'john@example.com'},
            path_collection: {,
              total_count: 1,
              entries: [
                {
                  id: '0',
                  type: 'folder',
                  name: 'All Files'},
              ]},
          {
            id: '22222',
            type: 'folder',
            name: 'Projects',
            size: 0,
            created_at: '2024-01-05T10:00:00Z',
            modified_at: '2024-01-12T15:00:00Z',
            owned_by: {,
              id: '12345',
              type: 'user',
              name: 'John Doe',
              login: 'john@example.com'},
            path_collection: {,
              total_count: 1,
              entries: [
                {
                  id: '0',
                  type: 'folder',
                  name: 'All Files'},
              ]},
        ],
        offset: 0,
        limit: 30}),
      'POST https://api.box.com/2.0/webhooks': IntegrationTestHelper.createMockApiResponse({,
        id: 'webhook1',
        type: 'webhook',
        target: {,
          id: '11111',
          type: 'file'},
        address: 'https://example.com/webhooks/box',
        triggers: ['FILE.UPLOADED', 'FILE.DOWNLOADED'],
        created_by: {,
          id: '12345',
          type: 'user',
          name: 'John Doe',
          login: 'john@example.com'},
        created_at: '2024-01-15T10:00:00Z'}),
      'GET https://api.box.com/2.0/webhooks': IntegrationTestHelper.createMockApiResponse({,
        total_count: 1,
        entries: [
          {
            id: 'webhook1',
            type: 'webhook',
            target: {,
              id: '11111',
              type: 'file'},
            address: 'https://example.com/webhooks/box',
            triggers: ['FILE.UPLOADED', 'FILE.DOWNLOADED'],
            created_by: {,
              id: '12345',
              type: 'user',
              name: 'John Doe',
              login: 'john@example.com'},
            created_at: '2024-01-15T10:00:00Z'},
        ]})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with OAuth', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'box_client_id',
        clientSecret: 'box_client_secret',
        code: 'auth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'box_access_token',
        refreshToken: 'box_refresh_token',
        expiresIn: 3600,
        userId: '12345',
        userInfo: {,
          id: '12345',
          name: 'John Doe',
          email: 'john@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'box_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(400, 'Invalid authorization code'),
        ),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'invalid',
        clientSecret: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: '12345',
        name: 'John Doe',
        email: 'john@example.com'})
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
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
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
            id: '11111',
            type: 'file',
            name: 'Document.pdf',
            size: 1024000}),
        ]),
        folders: expect.arrayContaining([
          expect.objectContaining({
            id: '22222',
            type: 'folder',
            name: 'Projects'}),
        ]),
        collaborations: expect.arrayContaining([
          expect.objectContaining({
            id: 'collab1',
            type: 'collaboration',
            role: 'editor'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('User Profile', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should get user profile successfully', async () => {
      const _profile = await integration.getUserProfile()
    }

      expect(profile).toMatchObject({
        id: '12345',
        type: 'user',
        name: 'John Doe',
        login: 'john@example.com',
        enterprise: {,
          id: '67890',
          name: 'Example Corp'},
        role: 'admin',
        status: 'active'})
    })
  })

  describe('Files Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should get files successfully', async () => {
      const files = await integration.getFiles('0', 100, 0)
    }

      expect(files).toHaveLength(2) // Only files, not folders
      expect(files[0]).toMatchObject({
        id: '11111',
        type: 'file',
        name: 'Document.pdf',
        size: 1024000})
    })

    it('should get specific file successfully', async () => {
      const file = await integration.getFile('11111')
    }

      expect(file).toMatchObject({
        id: '11111',
        type: 'file',
        name: 'Document.pdf',
        description: 'Important project document',
        size: 1024000})
    })

    it('should upload file successfully', async () => {
      const fileContent = Buffer.from('Test file content')
      const file = await integration.uploadFile('0', 'test-file.txt', fileContent)
    }

      expect(file).toMatchObject({
        id: '44444',
        type: 'file',
        name: 'uploaded-file.txt',
        size: 1024})
    })

    it('should download file successfully', async () => {
      const fileContent = await integration.downloadFile('11111')
    }

      expect(fileContent).toBeInstanceOf(ArrayBuffer)
      expect(fileContent.byteLength).toBe(1024)
    })

    it('should delete file successfully', async () => {
      const result = await integration.deleteFile('11111')
    }

      expect(result).toBe(true)
    })

    it('should copy file successfully', async () => {
      const copiedFile = await integration.copyFile('11111', '22222', 'Document (Copy).pdf')
    }

      expect(copiedFile).toMatchObject({
        id: '55555',
        type: 'file',
        name: 'Document (Copy).pdf',
        parent: {,
          id: '22222',
          type: 'folder'})
      }
    })
  })

  describe('Folders Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should get folders successfully', async () => {
      const folders = await integration.getFolders('0', 100, 0)
    }

      expect(folders).toHaveLength(1) // Only folders, not files
      expect(folders[0]).toMatchObject({
        id: '22222',
        type: 'folder',
        name: 'Projects'})
    })

    it('should get specific folder successfully', async () => {
      const folder = await integration.getFolder('22222')
    }

      expect(folder).toMatchObject({
        id: '22222',
        type: 'folder',
        name: 'Projects',
        description: 'Project files and documents',
        size: 5120000})
    })

    it('should create folder successfully', async () => {
      const folder = await integration.createFolder('0', 'New Project')
    }

      expect(folder).toMatchObject({
        id: '66666',
        type: 'folder',
        name: 'New Project',
        parent: {,
          id: '0',
          type: 'folder'})
      }
    })

    it('should delete folder successfully', async () => {
      const result = await integration.deleteFolder('22222', false)
    }

      expect(result).toBe(true)
    })
  })

  describe('Sharing & Collaboration', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should create shared link successfully', async () => {
      const sharedLink = await integration.createSharedLink('11111', 'file', 'open')
    }

      expect(sharedLink).toMatchObject({
        url: 'https://example.box.com/s/shared456',
        download_url: 'https://example.box.com/shared/static/shared456'})
    })

    it('should get collaborations successfully', async () => {
      const collaborations = await integration.getCollaborations('11111', 'file')
    }

      expect(collaborations).toHaveLength(1)
      expect(collaborations[0]).toMatchObject({
        id: 'collab1',
        type: 'collaboration',
        role: 'editor',
        status: 'accepted',
        accessible_by: {,
          id: '67890',
          name: 'Jane Smith'})
      }
    })

    it('should add collaboration successfully', async () => {
      const collaboration = await integration.addCollaboration(
        '11111',
        'file',
        'bob@example.com',
        'viewer',
      )
    }

      expect(collaboration).toMatchObject({
        id: 'collab2',
        type: 'collaboration',
        role: 'viewer',
        status: 'pending',
        accessible_by: {,
          id: '99999',
          name: 'Bob Wilson'})
      }
    })
  })

  describe('Comments', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should get comments successfully', async () => {
      const comments = await integration.getComments('11111')
    }

      expect(comments).toHaveLength(1)
      expect(comments[0]).toMatchObject({
        id: 'comment1',
        type: 'comment',
        message: 'This looks great!',
        created_by: {,
          id: '67890',
          name: 'Jane Smith'})
      }
    })

    it('should add comment successfully', async () => {
      const comment = await integration.addComment('11111', 'Thanks for the feedback!')
    }

      expect(comment).toMatchObject({
        id: 'comment2',
        type: 'comment',
        message: 'Thanks for the feedback!',
        created_by: {,
          id: '12345',
          name: 'John Doe'})
      }
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should search content successfully', async () => {
      const results = await integration.searchContent('document', 30, 0)
    }

      expect(results.files).toHaveLength(1)
      expect(results.folders).toHaveLength(1)
      expect(results.files[0]).toMatchObject({
        id: '11111',
        type: 'file',
        name: 'Document.pdf'})
      expect(results.folders[0]).toMatchObject({
        id: '22222',
        type: 'folder',
        name: 'Projects'})
    })
  })

  describe('Webhooks', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should create webhook successfully', async () => {
      const webhook = await integration.createWebhook(
        '11111',
        'file',
        'https://example.com/webhooks/box',
        ['FILE.UPLOADED', 'FILE.DOWNLOADED'],
      )
    }

      expect(webhook).toMatchObject({
        id: 'webhook1',
        type: 'webhook',
        target: {,
          id: '11111',
          type: 'file'},
        address: 'https://example.com/webhooks/box',
        triggers: ['FILE.UPLOADED', 'FILE.DOWNLOADED']})
    })

    it('should get webhooks successfully', async () => {
      const webhooks = await integration.getWebhooks()
    }

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]).toMatchObject({
        id: 'webhook1',
        type: 'webhook',
        address: 'https://example.com/webhooks/box'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process file upload webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json',
          'box-delivery-id': 'webhook123',
          'box-delivery-timestamp': '2024-01-15T10:00:00Z'},
        body: JSON.stringify({,
          trigger: 'FILE.UPLOADED',
          source: {,
            id: '11111',
            type: 'file',
            name: 'Document.pdf'},
          created_by: {,
            id: '12345',
            type: 'user',
            name: 'John Doe'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process folder events successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json',
          'box-delivery-id': 'webhook124'},
        body: JSON.stringify({,
          trigger: 'FOLDER.CREATED',
          source: {,
            id: '22222',
            type: 'folder',
            name: 'Projects'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process collaboration events successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          trigger: 'COLLABORATION.CREATED',
          source: {,
            id: 'collab1',
            type: 'collaboration'},
          additional_info: {,
            item: {
              id: '11111',
              type: 'file'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process comment events successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          trigger: 'COMMENT.CREATED',
          source: {,
            id: 'comment1',
            type: 'comment',
            message: 'This looks great!'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('box_access_token')
    })
  }

    it('should cache data effectively', async () => {
      await integration.getFiles('0', 100, 0)
      await integration.getFolders('0', 100, 0)
      await integration.getCollaborations('11111', 'file')
    }

      expect(integration['filesCache'].size).toBeGreaterThan(0)
      expect(integration['foldersCache'].size).toBeGreaterThan(0)
      expect(integration['collaborationsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getFiles('0', 100, 0)
      await integration.getFolders('0', 100, 0)
      await integration.getCollaborations('11111', 'file')
    }

      integration.clearCache()

      expect(integration['filesCache'].size).toBe(0)
      expect(integration['foldersCache'].size).toBe(0)
      expect(integration['collaborationsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'files',
        'folders',
        'sharing',
        'comments',
        'collaboration',
        'search',
        'webhooks',
        'users',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('box')
      expect(integration.name).toBe('Box')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
