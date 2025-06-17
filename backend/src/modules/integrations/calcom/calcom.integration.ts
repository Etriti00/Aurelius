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
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'
import * as crypto from 'crypto'

interface CalComWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface CalComTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  token_type: string
}

interface CalComUser {
  id: number,
  username: string
  name: string,
  email: string
  emailVerified: string | null,
  bio: string | null
  avatar: string | null,
  timeZone: string
  weekStart: string,
  endTime: number
  startTime: number,
  bufferTime: number
  hideBranding: boolean,
  theme: string | null
  createdDate: string,
  trialEndsAt: string | null
  defaultScheduleId: number | null,
  completedOnboarding: boolean
  locale: string | null,
  timeFormat: number | null
  brandColor: string,
  darkBrandColor: string
  allowDynamicBooking: boolean | null,
  away: boolean
  verified: boolean | null,
  role: 'USER' | 'ADMIN'
}

interface CalComEventType {
  id: number,
  title: string
  slug: string,
  description: string | null
  position: number,
  locations: CalComLocation[]
  length: number,
  hidden: boolean
  userId: number | null,
  teamId: number | null
  eventName: string | null,
  timeZone: string | null
  periodType: 'UNLIMITED' | 'ROLLING' | 'RANGE',
  periodStartDate: string | null
  periodEndDate: string | null,
  periodDays: number | null
  periodCountCalendarDays: boolean | null,
  requiresConfirmation: boolean
  recurringEvent: CalComRecurringEvent | null,
  disableGuests: boolean
  hideCalendarNotes: boolean,
  minimumBookingNotice: number
  beforeEventBuffer: number,
  afterEventBuffer: number
  schedulingType: 'ROUND_ROBIN' | 'COLLECTIVE' | null,
  price: number
  currency: string,
  slotInterval: number | null
  metadata: Record<string, unknown>
  successRedirectUrl: string | null,
  workflows: CalComWorkflow[]
  hosts: CalComHost[],
  owner: CalComUser | null
}

interface CalComLocation {
  type: string
  address?: string
  link?: string
  hostPhoneNumber?: string
  displayLocationPublicly?: boolean
}

interface CalComRecurringEvent {
  freq: number,
  count: number
  interval: number
}

interface CalComWorkflow {
  id: number,
  name: string
  userId: number | null,
  teamId: number | null
  trigger: 'BEFORE_EVENT' | 'AFTER_EVENT' | 'NEW_EVENT' | 'CANCELLED_EVENT' | 'RESCHEDULED_EVENT',
  time: number | null
  timeUnit: 'MINUTE' | 'HOUR' | 'DAY' | null,
  steps: CalComWorkflowStep[]
}

interface CalComWorkflowStep {
  id: number,
  stepNumber: number
  action: 'EMAIL_HOST' | 'EMAIL_ATTENDEE' | 'SMS_ATTENDEE' | 'WHATSAPP_ATTENDEE',
  workflowId: number
  sendTo: string | null,
  reminderBody: string | null
  emailSubject: string | null,
  template: 'REMINDER' | 'CUSTOM'
}

interface CalComHost {
  userId: number,
  eventTypeId: number
  isFixed: boolean,
  user: CalComUser
}

interface CalComBooking {
  id: number,
  uid: string
  userId: number | null,
  eventTypeId: number | null
  title: string,
  description: string | null
  customInputs: Record<string, unknown>
  startTime: string,
  endTime: string
  attendees: CalComAttendee[],
  location: string | null
  createdAt: string,
  updatedAt: string | null
  status: 'CANCELLED' | 'ACCEPTED' | 'REJECTED' | 'PENDING',
  paid: boolean
  payment: CalComPayment[],
  destinationCalendar: CalComDestinationCalendar | null
  cancellationReason: string | null,
  rejectionReason: string | null
  dynamicEventSlugRef: string | null,
  dynamicGroupSlugRef: string | null
  rescheduled: boolean | null,
  fromReschedule: string | null
  recurringEventId: string | null,
  smsReminderNumber: string | null
  workflowReminders: CalComWorkflowReminder[],
  scheduledJobs: string[]
  metadata: Record<string, unknown>
  isRecorded: boolean,
  iCalUID: string | null
  iCalSequence: number,
  references: CalComReference[]
  eventType: CalComEventType | null,
  user: CalComUser | null
}

interface CalComAttendee {
  id: number,
  email: string
  name: string,
  timeZone: string
  locale: string | null,
  bookingId: number
  noShow: boolean | null
}

interface CalComPayment {
  id: number,
  uid: string
  bookingId: number,
  amount: number
  fee: number,
  currency: string
  success: boolean,
  refunded: boolean
  data: Record<string, unknown>
  externalId: string,
  paymentOption: 'ON_BOOKING' | 'HOLD'
  booking: CalComBooking | null
}

interface CalComDestinationCalendar {
  id: number,
  integration: string
  externalId: string,
  userId: number | null
  eventTypeId: number | null,
  credentialId: number | null
}

interface CalComWorkflowReminder {
  id: number,
  bookingUid: string | null
  method: 'EMAIL' | 'SMS' | 'WHATSAPP',
  scheduledDate: string
  referenceId: string | null,
  scheduled: boolean
  workflowStepId: number | null
}

interface CalComReference {
  id: number,
  type: string
  uid: string,
  meetingId: string | null
  meetingPassword: string | null,
  meetingUrl: string | null
  externalCalendarId: string | null,
  deleted: boolean | null
  credentialId: number | null
}

interface CalComAvailability {
  id: number,
  label: string | null
  userId: number | null,
  eventTypeId: number | null
  days: number[],
  startTime: string
  endTime: string,
  date: string | null
}

interface CalComSchedule {
  id: number,
  name: string
  userId: number,
  timeZone: string
  availability: CalComAvailability[]
}

interface CalComTeam {
  id: number,
  name: string
  slug: string | null,
  logo: string | null
  bio: string | null,
  hideBranding: boolean
  brandColor: string,
  darkBrandColor: string
  theme: string | null,
  createdAt: string
  members: CalComTeamMember[]
}

interface CalComTeamMember {
  id: number,
  userId: number
  teamId: number,
  accepted: boolean
  role: 'MEMBER' | 'ADMIN' | 'OWNER',
  user: CalComUser
}

export class CalComIntegration extends BaseIntegration {
  readonly provider = 'calcom'
  readonly name = 'Cal.com'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.cal.com/v1'

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['read', 'write'],
        data: response
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch('https://api.cal.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: CalComTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.CALENDAR,
      IntegrationCapability.SCHEDULING,
      IntegrationCapability.VIDEO_CONFERENCING,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.EVENTS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: response.id
          username: response.username,
          email: response.email
          timeZone: response.timeZone,
          verified: response.verified
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync event types
      try {
        const eventTypeResult = await this.syncEventTypes()
        totalProcessed += eventTypeResult.processed
        totalErrors += eventTypeResult.errors
        if (eventTypeResult.errorMessages) {
          errors.push(...eventTypeResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Event type sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync bookings
      try {
        const bookingResult = await this.syncBookings()
        totalProcessed += bookingResult.processed
        totalErrors += bookingResult.errors
        if (bookingResult.errorMessages) {
          errors.push(...bookingResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Booking sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync schedules
      try {
        const scheduleResult = await this.syncSchedules()
        totalProcessed += scheduleResult.processed
        totalErrors += scheduleResult.errors
        if (scheduleResult.errorMessages) {
          errors.push(...scheduleResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Schedule sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`Cal.com sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const calcomPayload = payload as CalComWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (calcomPayload.type) {
        case 'BOOKING_CREATED':
        case 'BOOKING_RESCHEDULED':
        case 'BOOKING_CANCELLED':
        case 'BOOKING_CONFIRMED':
        case 'BOOKING_REJECTED':
          await this.handleBookingWebhook(calcomPayload)
          break
        case 'MEETING_STARTED':
        case 'MEETING_ENDED':
          await this.handleMeetingWebhook(calcomPayload)
          break
        case 'FORM_SUBMITTED':
          await this.handleFormWebhook(calcomPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${calcomPayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // Cal.com doesn't have a specific disconnect endpoint
      // The access token will naturally expire
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncEventTypes(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.event_types', async () => {
        return this.makeApiCall('/event-types', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const eventTypes = response.event_types || []

      for (const eventType of eventTypes) {
        try {
          await this.processEventType(eventType)
          processed++
        } catch (error) {
          errors.push(`Failed to process event type ${eventType.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Event type sync failed: ${(error as Error).message}`)
    }
  }

  private async syncBookings(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.bookings', async () => {
        return this.makeApiCall('/bookings', 'GET', undefined, { take: 100 })
      })

      let processed = 0
      const errors: string[] = []

      const bookings = response.bookings || []

      for (const booking of bookings) {
        try {
          await this.processBooking(booking)
          processed++
        } catch (error) {
          errors.push(`Failed to process booking ${booking.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Booking sync failed: ${(error as Error).message}`)
    }
  }

  private async syncSchedules(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.schedules', async () => {
        return this.makeApiCall('/schedules', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const schedules = response.schedules || []

      for (const schedule of schedules) {
        try {
          await this.processSchedule(schedule)
          processed++
        } catch (error) {
          errors.push(`Failed to process schedule ${schedule.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Schedule sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processEventType(eventType: any): Promise<void> {
    this.logger.debug(`Processing Cal.com event type: ${eventType.title}`)
    // Process event type data for Aurelius AI system
  }

  private async processBooking(booking: any): Promise<void> {
    this.logger.debug(`Processing Cal.com booking: ${booking.title}`)
    // Process booking data for Aurelius AI system
  }

  private async processSchedule(schedule: any): Promise<void> {
    this.logger.debug(`Processing Cal.com schedule: ${schedule.name}`)
    // Process schedule data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleBookingWebhook(payload: CalComWebhookPayload): Promise<void> {
    this.logger.debug(`Handling booking webhook: ${payload.id}`)
    // Handle booking webhook processing
  }

  private async handleMeetingWebhook(payload: CalComWebhookPayload): Promise<void> {
    this.logger.debug(`Handling meeting webhook: ${payload.id}`)
    // Handle meeting webhook processing
  }

  private async handleFormWebhook(payload: CalComWebhookPayload): Promise<void> {
    this.logger.debug(`Handling form webhook: ${payload.id}`)
    // Handle form webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature = headers['x-cal-signature-256'] || headers['X-Cal-Signature-256']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === `sha256=${expectedSignature}`
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Cal.com API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getEventTypes(): Promise<CalComEventType[]> {
    try {
      const response = await this.executeWithProtection('api.get_event_types', async () => {
        return this.makeApiCall('/event-types', 'GET')
      })

      return response.event_types || []
    } catch (error) {
      this.logError('getEventTypes', error as Error)
      throw new Error(`Failed to get event types: ${(error as Error).message}`)
    }
  }

  async getEventType(eventTypeId: number): Promise<CalComEventType> {
    try {
      const response = await this.executeWithProtection('api.get_event_type', async () => {
        return this.makeApiCall(`/event-types/${eventTypeId}`, 'GET')
      })

      return response.event_type
    } catch (error) {
      this.logError('getEventType', error as Error)
      throw new Error(`Failed to get event type: ${(error as Error).message}`)
    }
  }

  async createEventType(eventTypeData: {,
    title: string
    slug: string
    description?: string
    length: number
    locations?: CalComLocation[]
    hidden?: boolean
    requiresConfirmation?: boolean
    disableGuests?: boolean
    minimumBookingNotice?: number
    beforeEventBuffer?: number
    afterEventBuffer?: number
    price?: number
    currency?: string
    metadata?: Record<string, unknown>
  }): Promise<CalComEventType> {
    try {
      const response = await this.executeWithProtection('api.create_event_type', async () => {
        return this.makeApiCall('/event-types', 'POST', eventTypeData)
      })

      return response.event_type
    } catch (error) {
      this.logError('createEventType', error as Error)
      throw new Error(`Failed to create event type: ${(error as Error).message}`)
    }
  }

  async updateEventType(
    eventTypeId: number,
    eventTypeData: Partial<CalComEventType>
  ): Promise<CalComEventType> {
    try {
      const response = await this.executeWithProtection('api.update_event_type', async () => {
        return this.makeApiCall(`/event-types/${eventTypeId}`, 'PATCH', eventTypeData)
      })

      return response.event_type
    } catch (error) {
      this.logError('updateEventType', error as Error)
      throw new Error(`Failed to update event type: ${(error as Error).message}`)
    }
  }

  async deleteEventType(eventTypeId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_event_type', async () => {
        return this.makeApiCall(`/event-types/${eventTypeId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteEventType', error as Error)
      throw new Error(`Failed to delete event type: ${(error as Error).message}`)
    }
  }

  async getBookings(params?: {
    status?: 'CANCELLED' | 'ACCEPTED' | 'REJECTED' | 'PENDING'
    userId?: number
    eventTypeId?: number
    from?: string
    to?: string
    take?: number
    skip?: number
  }): Promise<CalComBooking[]> {
    try {
      const response = await this.executeWithProtection('api.get_bookings', async () => {
        return this.makeApiCall('/bookings', 'GET', undefined, params)
      })

      return response.bookings || []
    } catch (error) {
      this.logError('getBookings', error as Error)
      throw new Error(`Failed to get bookings: ${(error as Error).message}`)
    }
  }

  async getBooking(bookingId: number): Promise<CalComBooking> {
    try {
      const response = await this.executeWithProtection('api.get_booking', async () => {
        return this.makeApiCall(`/bookings/${bookingId}`, 'GET')
      })

      return response.booking
    } catch (error) {
      this.logError('getBooking', error as Error)
      throw new Error(`Failed to get booking: ${(error as Error).message}`)
    }
  }

  async createBooking(bookingData: {,
    eventTypeId: number
    start: string,
    end: string
    attendee: {,
      name: string
      email: string,
      timeZone: string
      language?: string
    }
    location?: string
    customInputs?: Record<string, unknown>
    metadata?: Record<string, unknown>
    recurringEventId?: string
    hasHashedBookingLink?: boolean
    hashedLink?: string
  }): Promise<CalComBooking> {
    try {
      const response = await this.executeWithProtection('api.create_booking', async () => {
        return this.makeApiCall('/bookings', 'POST', bookingData)
      })

      return response.booking
    } catch (error) {
      this.logError('createBooking', error as Error)
      throw new Error(`Failed to create booking: ${(error as Error).message}`)
    }
  }

  async updateBooking(
    bookingId: number,
    bookingData: {
      title?: string
      startTime?: string
      endTime?: string
      location?: string
      description?: string
    },
  ): Promise<CalComBooking> {
    try {
      const response = await this.executeWithProtection('api.update_booking', async () => {
        return this.makeApiCall(`/bookings/${bookingId}`, 'PATCH', bookingData)
      })

      return response.booking
    } catch (error) {
      this.logError('updateBooking', error as Error)
      throw new Error(`Failed to update booking: ${(error as Error).message}`)
    }
  }

  async cancelBooking(bookingId: number, cancellationReason?: string): Promise<CalComBooking> {
    try {
      const response = await this.executeWithProtection('api.cancel_booking', async () => {
        return this.makeApiCall(`/bookings/${bookingId}/cancel`, 'DELETE', {
          cancellationReason
        })
      })

      return response.booking
    } catch (error) {
      this.logError('cancelBooking', error as Error)
      throw new Error(`Failed to cancel booking: ${(error as Error).message}`)
    }
  }

  async rescheduleBooking(
    bookingId: number,
    rescheduleData: {
      start: string,
      end: string
      rescheduleReason?: string
    },
  ): Promise<CalComBooking> {
    try {
      const response = await this.executeWithProtection('api.reschedule_booking', async () => {
        return this.makeApiCall(`/bookings/${bookingId}/reschedule`, 'PATCH', rescheduleData)
      })

      return response.booking
    } catch (error) {
      this.logError('rescheduleBooking', error as Error)
      throw new Error(`Failed to reschedule booking: ${(error as Error).message}`)
    }
  }

  async getSchedules(): Promise<CalComSchedule[]> {
    try {
      const response = await this.executeWithProtection('api.get_schedules', async () => {
        return this.makeApiCall('/schedules', 'GET')
      })

      return response.schedules || []
    } catch (error) {
      this.logError('getSchedules', error as Error)
      throw new Error(`Failed to get schedules: ${(error as Error).message}`)
    }
  }

  async getSchedule(scheduleId: number): Promise<CalComSchedule> {
    try {
      const response = await this.executeWithProtection('api.get_schedule', async () => {
        return this.makeApiCall(`/schedules/${scheduleId}`, 'GET')
      })

      return response.schedule
    } catch (error) {
      this.logError('getSchedule', error as Error)
      throw new Error(`Failed to get schedule: ${(error as Error).message}`)
    }
  }

  async createSchedule(scheduleData: {,
    name: string
    timeZone: string,
    availability: Array<{
      days: number[],
      startTime: string
      endTime: string
    }>
  }): Promise<CalComSchedule> {
    try {
      const response = await this.executeWithProtection('api.create_schedule', async () => {
        return this.makeApiCall('/schedules', 'POST', scheduleData)
      })

      return response.schedule
    } catch (error) {
      this.logError('createSchedule', error as Error)
      throw new Error(`Failed to create schedule: ${(error as Error).message}`)
    }
  }

  async updateSchedule(
    scheduleId: number,
    scheduleData: Partial<CalComSchedule>
  ): Promise<CalComSchedule> {
    try {
      const response = await this.executeWithProtection('api.update_schedule', async () => {
        return this.makeApiCall(`/schedules/${scheduleId}`, 'PATCH', scheduleData)
      })

      return response.schedule
    } catch (error) {
      this.logError('updateSchedule', error as Error)
      throw new Error(`Failed to update schedule: ${(error as Error).message}`)
    }
  }

  async deleteSchedule(scheduleId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_schedule', async () => {
        return this.makeApiCall(`/schedules/${scheduleId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteSchedule', error as Error)
      throw new Error(`Failed to delete schedule: ${(error as Error).message}`)
    }
  }

  async getAvailability(params: {
    username?: string
    eventTypeId?: number
    dateFrom: string,
    dateTo: string
    timeZone?: string
  }): Promise<
    Array<{
      start: string,
      end: string
      title?: string
    }>
  > {
    try {
      const response = await this.executeWithProtection('api.get_availability', async () => {
        return this.makeApiCall('/availability', 'GET', undefined, params)
      })

      return response.busy || []
    } catch (error) {
      this.logError('getAvailability', error as Error)
      throw new Error(`Failed to get availability: ${(error as Error).message}`)
    }
  }

  async getTeams(): Promise<CalComTeam[]> {
    try {
      const response = await this.executeWithProtection('api.get_teams', async () => {
        return this.makeApiCall('/teams', 'GET')
      })

      return response.teams || []
    } catch (error) {
      this.logError('getTeams', error as Error)
      throw new Error(`Failed to get teams: ${(error as Error).message}`)
    }
  }

  async getTeam(teamId: number): Promise<CalComTeam> {
    try {
      const response = await this.executeWithProtection('api.get_team', async () => {
        return this.makeApiCall(`/teams/${teamId}`, 'GET')
      })

      return response.team
    } catch (error) {
      this.logError('getTeam', error as Error)
      throw new Error(`Failed to get team: ${(error as Error).message}`)
    }
  }

  async createTeam(teamData: {,
    name: string
    slug?: string
    logo?: string
    bio?: string
    hideBranding?: boolean
    brandColor?: string
    darkBrandColor?: string
    theme?: string
  }): Promise<CalComTeam> {
    try {
      const response = await this.executeWithProtection('api.create_team', async () => {
        return this.makeApiCall('/teams', 'POST', teamData)
      })

      return response.team
    } catch (error) {
      this.logError('createTeam', error as Error)
      throw new Error(`Failed to create team: ${(error as Error).message}`)
    }
  }

  async updateTeam(teamId: number, teamData: Partial<CalComTeam>): Promise<CalComTeam> {
    try {
      const response = await this.executeWithProtection('api.update_team', async () => {
        return this.makeApiCall(`/teams/${teamId}`, 'PATCH', teamData)
      })

      return response.team
    } catch (error) {
      this.logError('updateTeam', error as Error)
      throw new Error(`Failed to update team: ${(error as Error).message}`)
    }
  }

  async deleteTeam(teamId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_team', async () => {
        return this.makeApiCall(`/teams/${teamId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTeam', error as Error)
      throw new Error(`Failed to delete team: ${(error as Error).message}`)
    }
  }

  async getUserProfile(): Promise<CalComUser> {
    try {
      const response = await this.executeWithProtection('api.get_user_profile', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return response.user
    } catch (error) {
      this.logError('getUserProfile', error as Error)
      throw new Error(`Failed to get user profile: ${(error as Error).message}`)
    }
  }

  async updateUserProfile(userData: Partial<CalComUser>): Promise<CalComUser> {
    try {
      const response = await this.executeWithProtection('api.update_user_profile', async () => {
        return this.makeApiCall('/me', 'PATCH', userData)
      })

      return response.user
    } catch (error) {
      this.logError('updateUserProfile', error as Error)
      throw new Error(`Failed to update user profile: ${(error as Error).message}`)
    }
  }
}
