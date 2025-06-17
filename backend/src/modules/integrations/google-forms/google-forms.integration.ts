import { google } from 'googleapis'
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload,
  ThirdPartyClient
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class GoogleFormsIntegration extends BaseIntegration {
  readonly provider = 'google-forms'
  readonly name = 'Google Forms'
  readonly version = '1.0.0'

  private oauth2Client: ThirdPartyClient
  private forms: unknown

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId,
      config?.clientSecret,
      config?.redirectUri,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.forms = google.forms({ version: 'v1', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by creating a simple form (and immediately deleting it)
      const testForm = await this.forms.forms.create({ resource: {,
          info: {
            title: 'Test Form - Will be deleted' }
        }
      })
  }

      // Clean up test form
      if (testForm.data.formId) {
        try {
          await this.forms.forms.batchUpdate({
            formId: testForm.data.formId,
            resource: { requests: [
                {
                  updateSettings: {,
                    settings: {
                      quizSettings: {,
                        isQuiz: false }
                    },
                    updateMask: 'quizSettings.isQuiz'
                  }
                },
              ]
            }
          })
        }

        catch (error) {
          console.error('Error in google-forms.integration.ts:', error)
          throw error
        }
      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'https://www.googleapis.com/auth/forms.body',
          'https://www.googleapis.com/auth/forms.responses.readonly',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        return this.authenticate()
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      return {
        success: true,
        accessToken: credentials.access_token
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        scope: credentials.scope?.split(' ') || [
          'https://www.googleapis.com/auth/forms.body',
          'https://www.googleapis.com/auth/forms.responses.readonly',
        ]
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.oauth2Client.revokeCredentials()
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Simple connection test - try to get user info
      const tokenInfo = await this.oauth2Client.getTokenInfo(this.accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 60000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Forms',
        description: 'Create and manage Google Forms'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/forms.body']
      },
      {
        name: 'Questions',
        description: 'Add and modify form questions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/forms.body']
      },
      {
        name: 'Responses',
        description: 'Access form responses and submissions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/forms.responses.readonly']
      },
      {
        name: 'Settings',
        description: 'Configure form settings and permissions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/forms.body']
      },
      {
        name: 'Analytics',
        description: 'View form analytics and statistics'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/forms.responses.readonly']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
  }

    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      const totalProcessed = 0
      const totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Google Forms sync', { lastSyncTime })

      // Note: Google Forms API doesn't provide a way to list all forms owned by a user
      // Forms need to be accessed individually by formId
      // This is a limitation of the API design

      return {
        success: true,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider,
          note: 'Google Forms API requires individual form IDs for access'
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Google Forms sync failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in google-forms.integration.ts:', error)
      throw error
    }
  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Forms webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'form.response.submitted':
          await this.handleResponseWebhook(payload.data)
          break
        case 'form.updated':
          await this.handleFormWebhook(payload.data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook event: ${payload._event}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in google-forms.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Forms webhook validation would be implemented here,
    return true
  }

  // Private webhook handlers
  private async handleResponseWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleResponseWebhook', 'Processing response webhook', data)
  }

  private async handleFormWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFormWebhook', 'Processing form webhook', data)
  }

  // Public API methods
  async createForm(formData: {,
    title: string
    description?: string,
    documentTitle?: string
  }): Promise<string> {
    try {
      const _response = await this.forms.forms.create({
        resource: {,
          info: {
            title: formData.title,
            description: formData.description
            documentTitle: formData.documentTitle || formData.title
          }
        }
      })

      return (response as Response).data.formId
    } catch (error) {
      this.logError('createForm', error as Error)
      throw new Error(`Failed to create Google Form: ${(error as Error).message}`)
    }

  async getForm(formId: string): Promise<ApiResponse> {
    try {
      const _response = await this.forms.forms.get({
        formId
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getForm', error as Error)
      throw new Error(`Failed to get Google Form: ${(error as Error).message}`)
    }

  async updateForm(formId: string, updates: unknown[]): Promise<void> {
    try {
      await this.forms.forms.batchUpdate({
        formId,
        resource: { requests: updates }
      })
    } catch (error) {
      this.logError('updateForm', error as Error)
      throw new Error(`Failed to update Google Form: ${(error as Error).message}`)
    }

  async addQuestion(
    formId: string,
    questionData: {
      title: string
      description?: string
      type: 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'PARAGRAPH' | 'SHORT_ANSWER' | 'DROPDOWN' | 'SCALE'
      required?: boolean
      options?: string[]
      scale?: { low: number; high: number; lowLabel?: string; highLabel?: string },
  ): Promise<string> {
    try {
      const questionItem: unknown = {,
        title: questionData.title
        description: questionData.description,
        questionItem: { question: {
            required: questionData.required || false }
        }
      }

      // Configure question based on type
      switch (questionData.type) {
        case 'MULTIPLE_CHOICE':
          questionItem.questionItem.question.choiceQuestion = {
            type: 'RADIO',
            options: questionData.options?.map(option => ({ value: option })) || []
          }
          break
        case 'CHECKBOX':
          questionItem.questionItem.question.choiceQuestion = {
            type: 'CHECKBOX',
            options: questionData.options?.map(option => ({ value: option })) || []
          }
          break
        case 'DROPDOWN':
          questionItem.questionItem.question.choiceQuestion = {
            type: 'DROP_DOWN',
            options: questionData.options?.map(option => ({ value: option })) || []
          }
          break
        case 'PARAGRAPH':
          questionItem.questionItem.question.textQuestion = { paragraph: true }
          break
        case 'SHORT_ANSWER':
          questionItem.questionItem.question.textQuestion = { paragraph: false }
          break
        case 'SCALE':
          if (questionData.scale) {
            questionItem.questionItem.question.scaleQuestion = {
              low: questionData.scale.low,
              high: questionData.scale.high
              lowLabel: questionData.scale.lowLabel,
              highLabel: questionData.scale.highLabel
            },
          break
      }
          }
      }

      const _response = await this.forms.forms.batchUpdate({
        formId,
        resource: {,
          requests: [
            {
              createItem: {,
                item: questionItem
                location: { index: 0 }
              }
            },
          ]
        }
      })

      return (response as Response).data.replies[0].createItem.itemId
    }
    } catch (error) {
      this.logError('addQuestion', error as Error)
      throw new Error(`Failed to add question to Google Form: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-forms.integration.ts:', error)
      throw error
    }
  async deleteQuestion(formId: string, itemId: string): Promise<void> {
    try {
      await this.forms.forms.batchUpdate({
        formId,
        resource: {,
          requests: [
            {
              deleteItem: {,
                location: {
                  index: 0, // This should be the actual index
                }
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('deleteQuestion', error as Error)
      throw new Error(`Failed to delete question from Google Form: ${(error as Error).message}`)
    }

  async getResponses(
    formId: string
    options?: {
      filter?: string
      pageSize?: number,
      pageToken?: string
    },
  ): Promise<{ responses: unknown[]; nextPageToken?: string }> {
    try {
      const _response = await this.forms.forms.responses.list({
        formId,
        filter: options?.filter,
        pageSize: options?.pageSize || 100
        pageToken: options?.pageToken
      })

      return {
        responses: response.data.responses || [],
        nextPageToken: response.data.nextPageToken
      }
    } catch (error) {
      this.logError('getResponses', error as Error)
      throw new Error(`Failed to get Google Form responses: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-forms.integration.ts:', error)
      throw error
    }
  async getResponse(formId: string, responseId: string): Promise<ApiResponse> {
    try {
      const _response = await this.forms.forms.responses.get({
        formId,
        responseId
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getResponse', error as Error)
      throw new Error(`Failed to get Google Form response: ${(error as Error).message}`)
    }

  async publishForm(formId: string): Promise<string> {
    try {
      // Get the form to extract the published URL
      const form = await this.getForm(formId)
      return form.responderUri || `https://docs.google.com/forms/d/${formId}/edit`
    } catch (error) {
      this.logError('publishForm', error as Error)
      throw new Error(`Failed to publish Google Form: ${(error as Error).message}`)
    }

  async duplicateForm(formId: string, newTitle?: string): Promise<string> {
    try {
      // Get original form
      const originalForm = await this.getForm(formId)
  }

      // Create new form with same structure
      const newFormId = await this.createForm({
        title: newTitle || `Copy of ${originalForm.info.title}`,
        description: originalForm.info.description
      })

      // Copy all items from original form
      if (originalForm.items && originalForm.items.length > 0) {
        const requests = originalForm.items.map((item: unknown, index: number) => ({,
          createItem: {
            item,
            location: { index }
          }
        }))
      }

        await this.updateForm(newFormId, requests)
      },

      return newFormId
    } catch (error) {
      this.logError('duplicateForm', error as Error)
      throw new Error(`Failed to duplicate Google Form: ${(error as Error).message}`)
    }

  async updateFormSettings(
    formId: string,
    settings: {
      collectEmail?: boolean
      limitToOneResponse?: boolean
      allowResponseEditing?: boolean
      showLinkToRespondAgain?: boolean,
      confirmationMessage?: string
    },
  ): Promise<void> {
    try {
      const updateRequests: unknown[] = []

      if (
        settings.collectEmail !== undefined ||
        settings.limitToOneResponse !== undefined ||
        settings.allowResponseEditing !== undefined ||
        settings.showLinkToRespondAgain !== undefined
      ) {
        updateRequests.push({ updateSettings: {,
            settings: {
              quizSettings: settings },
            updateMask: Object.keys(settings).join(',')
          }
        })
      }

      if (settings.confirmationMessage) {
        updateRequests.push({ updateFormInfo: {,
            info: {
              confirmationMessage: settings.confirmationMessage },
            updateMask: 'confirmationMessage'
          }
        })
      }

      if (updateRequests.length > 0) {
        await this.updateForm(formId, updateRequests)
      }
    } catch (error) {
      this.logError('updateFormSettings', error as Error)
      throw new Error(`Failed to update Google Form settings: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-forms.integration.ts:', error)
      throw error
    }
  async getFormAnalytics(formId: string): Promise<ApiResponse> {
    try {
      const responses = await this.getResponses(formId)
      const form = await this.getForm(formId)
  }

      // Calculate basic analytics
      const analytics = {
        totalResponses: responses.responses.length,
        questions: form.items?.length || 0
        lastResponse:
          responses.responses.length > 0
            ? responses.responses[responses.responses.length - 1].lastSubmittedTime
            : null,
        formCreated: form.info.createdTime,
        responseRate: 0, // Would need view data to calculate
      },

      return analytics
    } catch (error) {
      this.logError('getFormAnalytics', error as Error)
      throw new Error(`Failed to get Google Form analytics: ${(error as Error).message}`)
    }

}