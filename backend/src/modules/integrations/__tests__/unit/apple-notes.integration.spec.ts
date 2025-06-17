import { AppleNotesIntegration } from '../../apple-notes/apple-notes.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('AppleNotesIntegration', () => {
  let integration: AppleNotesIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      AppleNotesIntegration,
      'apple-notes',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/tokens/auth':
        IntegrationTestHelper.createMockApiResponse({
          token: 'test_cloudkit_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600}),
      'GET https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/users/current':
        IntegrationTestHelper.createMockApiResponse({
          userRecordName: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          emailAddress: 'john@example.com'}),
      'POST https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/records/query':
        IntegrationTestHelper.createMockApiResponse({
          records: [
            {
              identifier: 'note1',
              recordName: 'note1',
              recordType: 'Note',
              title: 'Meeting Notes',
              content: 'Important meeting discussion points',
              creationDate: '2024-01-01T10:00:00Z',
              modificationDate: '2024-01-01T11:00:00Z',
              folder: 'folder1',
              isDeleted: false,
              tags: ['work', 'meeting'],
              attachments: []},
            {
              identifier: 'folder1',
              recordName: 'folder1',
              recordType: 'Folder',
              name: 'Work Notes',
              creationDate: '2024-01-01T09:00:00Z',
              modificationDate: '2024-01-01T09:00:00Z',
              isDeleted: false,
              noteCount: 5},
          ],
          syncToken: 'sync_token_123'}),
      'POST https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/records/modify':
        IntegrationTestHelper.createMockApiResponse({
          records: [
            {
              identifier: 'new_note',
              recordName: 'new_note',
              recordType: 'Note',
              title: 'New Note',
              content: 'New note content',
              creationDate: '2024-01-15T12:00:00Z',
              modificationDate: '2024-01-15T12:00:00Z',
              folder: 'folder1',
              isDeleted: false,
              tags: [],
              attachments: []},
          ]}),
      'POST https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/records/lookup':
        IntegrationTestHelper.createMockApiResponse({
          records: [
            {
              identifier: 'note1',
              recordName: 'note1',
              recordType: 'Note',
              title: 'Meeting Notes',
              content: 'Important meeting discussion points',
              creationDate: '2024-01-01T10:00:00Z',
              modificationDate: '2024-01-01T11:00:00Z',
              folder: 'folder1',
              isDeleted: false,
              tags: ['work', 'meeting'],
              attachments: []},
          ]})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with API key and secret', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        apiKey: 'test_api_key',
        apiSecret: 'test_api_secret'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_cloudkit_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        userId: 'user123',
        userInfo: {,
          id: 'user123',
          name: 'John',
          email: 'john@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_cloudkit_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        apiKey: 'invalid',
        apiSecret: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'user123',
        name: 'John',
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
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        folders: expect.arrayContaining([
          expect.objectContaining({
            identifier: 'folder1',
            name: 'Work Notes'}),
        ]),
        notes: expect.arrayContaining([
          expect.objectContaining({
            identifier: 'note1',
            title: 'Meeting Notes'}),
        ]),
        tags: expect.any(Array),
        syncedAt: expect.any(String),
        syncToken: 'sync_token_123'})
    })
  })

  describe('Notes Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should get notes successfully', async () => {
      const notes = await integration.getNotes()
    }

      expect(notes).toHaveLength(1)
      expect(notes[0]).toMatchObject({
        identifier: 'note1',
        title: 'Meeting Notes',
        content: 'Important meeting discussion points',
        tags: ['work', 'meeting']})
    })

    it('should get specific note successfully', async () => {
      const note = await integration.getNote('note1')
    }

      expect(note).toMatchObject({
        identifier: 'note1',
        title: 'Meeting Notes',
        content: 'Important meeting discussion points'})
    })

    it('should create note successfully', async () => {
      const note = await integration.createNote('New Note', 'New note content', 'folder1', ['test'])
    }

      expect(note).toMatchObject({
        identifier: 'new_note',
        title: 'New Note',
        content: 'New note content'})
    })

    it('should update note successfully', async () => {
      const updates = {
        title: 'Updated Note',
        content: 'Updated content'}
    }

      const note = await integration.updateNote('note1', updates)

      expect(note).toMatchObject({
        identifier: 'new_note',
        title: 'New Note'})
    })

    it('should delete note successfully', async () => {
      const result = await integration.deleteNote('note1')
    }

      expect(result).toBe(true)
    })
  })

  describe('Folders Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should get folders successfully', async () => {
      const folders = await integration.getFolders()
    }

      expect(folders).toHaveLength(1)
      expect(folders[0]).toMatchObject({
        identifier: 'folder1',
        name: 'Work Notes',
        noteCount: 5})
    })

    it('should create folder successfully', async () => {
      const folder = await integration.createFolder('New Folder')
    }

      expect(folder).toMatchObject({
        identifier: 'new_note',
        recordType: 'Note'})
    })

    it('should update folder successfully', async () => {
      const folder = await integration.updateFolder('folder1', 'Updated Folder')
    }

      expect(folder).toMatchObject({
        identifier: 'new_note'})
    })

    it('should delete folder successfully', async () => {
      const result = await integration.deleteFolder('folder1')
    }

      expect(result).toBe(true)
    })
  })

  describe('Tags Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should get tags successfully', async () => {
      const tags = await integration.getTags()
    }

      expect(tags).toEqual([])
    })

    it('should create tag successfully', async () => {
      const tag = await integration.createTag('New Tag', '#FF0000')
    }

      expect(tag).toMatchObject({
        identifier: 'new_note'})
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should search notes successfully', async () => {
      const notes = await integration.searchNotes('Meeting')
    }

      expect(notes).toHaveLength(1)
      expect(notes[0]).toMatchObject({
        identifier: 'note1',
        title: 'Meeting Notes'})
    })

    it('should search notes in specific folder', async () => {
      const notes = await integration.searchNotes('Meeting', 'folder1')
    }

      expect(notes).toHaveLength(1)
    })
  })

  describe('Attachments', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should get note attachments successfully', async () => {
      const attachments = await integration.getNoteAttachments('note1')
    }

      expect(attachments).toEqual([])
    })
  })

  describe('Webhook Handling', () => {
    it('should process note update webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          recordType: 'Note',
          recordName: 'note1',
          reason: 'update'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process folder update webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          recordType: 'Folder',
          recordName: 'folder1',
          reason: 'update'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process note delete webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          recordType: 'Note',
          recordName: 'note1',
          reason: 'delete'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_cloudkit_token')
    })
  }

    it('should cache notes and folders', async () => {
      await integration.getNotes()
      await integration.getFolders()
    }

      expect(integration['notesCache'].size).toBeGreaterThan(0)
      expect(integration['foldersCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getNotes()
      await integration.getFolders()
    }

      integration.clearCache()

      expect(integration['notesCache'].size).toBe(0)
      expect(integration['foldersCache'].size).toBe(0)
      expect(integration['tagsCache'].size).toBe(0)
      expect(integration['syncToken']).toBeNull()
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'notes',
        'folders',
        'search',
        'sync',
        'attachments',
        'tags',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('apple-notes')
      expect(integration.name).toBe('Apple Notes')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
