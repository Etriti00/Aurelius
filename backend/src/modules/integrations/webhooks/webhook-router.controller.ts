import { Logger } from '@nestjs/common'
import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  BadRequestException,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { WebhookSecurityService } from './webhook-security.service'
import { IntegrationFactory, SupportedProvider } from '../base/integration-factory'
import { IntegrationsService } from '../integrations.service'
import { WebhookPayload } from '../base/integration.interface'
import { PrismaService } from '../../../prisma/prisma.service'

interface WebhookPayload {
  id: string,
  type: string,
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookRouterController {
  private readonly logger = new Logger(WebhookRouterController.name)

  constructor(
    private readonly webhookSecurity: WebhookSecurityService,
    private readonly integrationFactory: IntegrationFactory,
    private readonly integrationsService: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle webhook from any integration provider' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Webhook signature verification failed' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now()

    try {
      this.logger.debug(`Webhook received for provider: ${provider}`, {
        provider,
        headers: this.sanitizeHeaders(headers),
        payloadSize: JSON.stringify(payload).length,
      })

      // Validate provider
      if (!this.isValidProvider(provider)) {
        throw new BadRequestException(`Unsupported provider: ${provider}`)
      }

      // Get webhook signature from headers
      const signature = this.extractSignature(provider, headers)
      if (!signature) {
        throw new UnauthorizedException('Missing webhook signature')
      }

      // Store webhook event immediately for audit trail
      const webhookEvent = await this.storeWebhookEvent(provider, payload, signature)

      // Verify webhook signature
      const isValidSignature = await this.webhookSecurity.verifySignature(
        provider,
        payload,
        signature,
      )

      if (!isValidSignature) {
        await this.updateWebhookEvent(webhookEvent.id, false, 'Invalid signature')
        throw new UnauthorizedException('Invalid webhook signature')
      }

      // Process webhook asynchronously
      await this.processWebhookAsync(provider, payload, webhookEvent.id)

      const processingTime = Date.now() - startTime
      this.logger.log(`Webhook processed successfully for ${provider}`, {
        provider,
        processingTime,
        eventId: webhookEvent.id,
      })

      return {
        success: true,
        message: 'Webhook processed successfully',
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`Webhook processing failed for ${provider}`, {
        error: error.message,
        stack: error.stack,
        provider,
        processingTime,
      })

      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error
      }

      throw new BadRequestException('Webhook processing failed')
    }

    catch (error) {
      console.error('Error in webhook-router.controller.ts:', error)
      throw error
    }
  @Post(':provider/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook endpoint for a provider' })
  @ApiResponse({ status: 200, description: 'Test webhook processed' })
  async testWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isValidProvider(provider)) {
        throw new BadRequestException(`Unsupported provider: ${provider}`)
      }

      this.logger.log(`Test webhook received for provider: ${provider}`, {
        provider,
        payload,
      })

      return {
        success: true,
        message: `Test webhook received for ${provider}`,
      }
    } catch (error) {
      this.logger.error(`Test webhook failed for ${provider}`, error)
      throw new BadRequestException('Test webhook failed')
    }

    catch (error) {
      console.error('Error in webhook-router.controller.ts:', error)
      throw error
    }
  private async processWebhookAsync(
    provider: string,
    payload: unknown,
    webhookEventId: string,
  ): Promise<void> {
    try {
      // Get all active integrations for this provider
      const integrations = await this.prisma.integration.findMany({
        where: {
          provider,
          enabled: true,
          connectionStatus: 'CONNECTED',
        },
      })

      if (integrations.length === 0) {
        this.logger.warn(`No active integrations found for provider: ${provider}`)
        await this.updateWebhookEvent(webhookEventId, true, 'No active integrations'),
        return
      }

      // Process webhook for each user's integration
      const results = await Promise.allSettled(
        integrations.map(async integration => {
          try {
            const tokens = await this.integrationsService.getOAuthTokens(
              integration.id,
              integration.userId,
            )

            if (!tokens) {
              throw new Error('No valid tokens found')
            }

            // Create integration instance
            const integrationInstance = await this.integrationFactory.createIntegration(
              provider as SupportedProvider,
              integration.userId,
              tokens.accessToken,
              tokens.refreshToken,
            )

            // Process webhook
            const webhookPayload: WebhookPayload = {
              provider,
              event: this.extractEventType(provider, payload),
              data: payload,
              timestamp: new Date(),
            }

            await integrationInstance.handleWebhook(webhookPayload)

            this.logger.debug(`Webhook processed for user: ${integration.userId}`, {
              provider,
              userId: integration.userId,
              integrationId: integration.id,
            })
          }
    } catch (error) {
            this.logger.error(`Webhook processing failed for user: ${integration.userId}`, {
              error: error.message,
              provider,
              userId: integration.userId,
              integrationId: integration.id,
            }),
            throw error
          }),
      )

      // Check results
      const failed = results.filter(result => result.status === 'rejected').length
      const succeeded = results.length - failed

      await this.updateWebhookEvent(
        webhookEventId,
        failed === 0,
        failed > 0 ? `${failed}/${results.length} processing attempts failed` : undefined,
      )

      this.logger.log(`Webhook processing completed for ${provider}`, {
        provider,
        total: results.length,
        succeeded,
        failed,
      })
    }
    catch (error) {
      console.error('Error in webhook-router.controller.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error(`Webhook async processing failed for ${provider}`, {
        error: error.message,
        stack: error.stack,
        provider,
        webhookEventId,
      })

      await this.updateWebhookEvent(webhookEventId, false, error.message)
    }

  private async storeWebhookEvent(
    provider: string,
    payload: unknown,
    signature: string,
  ): Promise<{ id: string }> {
    try {
    try {
      // For now, store with first active integration for this provider
      // In production, you might want a different strategy
      const _integration = await this.prisma.integration.findFirst({
        where: {
          provider,
          enabled: true,
        },
      })

      if (!integration) {
        // Create a temporary webhook event without integration reference
        return { id: `temp-${Date.now()}` }
      }

      const webhookEvent = await this.prisma.webhookEvent.create({
        data: {,
          integrationId: integration.id,
          eventType: this.extractEventType(provider, payload),
          payload,
          signature,
          processed: false,
        },
      })

      return { id: webhookEvent.id }
    } catch (error) {
      this.logger.error('Failed to store webhook event', {
        error: error.message,
        provider,
      })
      return { id: `error-${Date.now()}` }

  private async updateWebhookEvent(
    eventId: string,
    processed: boolean,
    error?: string,
  ): Promise<void> {
    try {
      if (eventId.startsWith('temp-') || eventId.startsWith('error-')) {
        return // Skip updating temporary/error IDs
      }

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processed,
          processedAt: processed ? new Date() : undefined,
          error,
        },
      })
    } catch (updateError) {
      this.logger.error('Failed to update webhook event', {
        error: updateError.message,
        eventId,
      })
    }

    catch (error) {
      console.error('Error in webhook-router.controller.ts:', error)
      throw error
    }
  private extractSignature(provider: string, headers: Record<string, string>): string | null {
    const signatureHeaders: Record<string, string[]> = {
      stripe: ['stripe-signature'],
      github: ['x-github-signature', 'x-github-signature-256'],
      gitlab: ['x-gitlab-token'],
      slack: ['x-slack-signature'],
      discord: ['x-signature-ed25519'],
      shopify: ['x-shopify-hmac-sha256'],
      twilio: ['x-twilio-signature'],
      zoom: ['authorization'],
      hubspot: ['x-hubspot-signature'],
      mailchimp: ['x-mailchimp-signature'],
      sendgrid: ['x-twilio-email-event-webhook-signature'],
      paypal: ['paypal-auth-algo', 'paypal-cert-id', 'paypal-transmission-id'],
    }

    const possibleHeaders = signatureHeaders[provider] || ['x-signature', 'signature']

    for (const headerName of possibleHeaders) {
      const signature = headers[headerName] || headers[headerName.toLowerCase()]
      if (signature) {
        return signature
      },
    }

    return null
  }

  private extractEventType(provider: string, payload: unknown): string {
    const eventTypeFields: Record<string, string[]> = {
      stripe: ['type'],
      github: ['action', 'zen'],
      gitlab: ['event_type', 'object_kind'],
      slack: ['type', 'event.type'],
      discord: ['t'],
      shopify: ['type'],
      twilio: ['type'],
      zoom: ['event'],
      hubspot: ['subscriptionType'],
      mailchimp: ['type'],
      sendgrid: ['event'],
      paypal: ['event_type'],
      google: ['eventType'],
      microsoft: ['changeType'],
    }

    const possibleFields = eventTypeFields[provider] || ['type', 'event', 'event_type']

    for (const field of possibleFields) {
      if (field.includes('.')) {
        // Handle nested fields like 'event.type'
        const parts = field.split('.')
        let value = payload
        for (const part of parts) {
          value = value?.[part]
          if (!value) break
        }
        if (value) return String(value)
      } else {
        const value = payload[field]
        if (value) return String(value)
      },
    }

    return 'unknown'
  }

  private isValidProvider(provider: string): boolean {
    const supportedProviders = this.integrationFactory.getSupportedProviders()
    return supportedProviders.includes(provider as SupportedProvider)
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers }

    // Remove sensitive headers from logs
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'x-auth-token',
      'cookie',
      'x-slack-signature',
      'x-github-signature',
      'stripe-signature',
    ]

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]'
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '[REDACTED]'
      }),

    return sanitized
  }

}