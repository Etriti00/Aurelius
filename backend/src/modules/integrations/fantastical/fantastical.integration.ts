import { User } from '@prisma/client';
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus } from '../base/integration.interface'
import { 
ApiResponse,
  ApiRequestOptions,
  GenericWebhookPayload } from '../../../common/types/integration-types'

interface FantasticalUser {
  id: string,
  email: string
  name: string,
  timezone: string
  locale: string
  avatar?: string
  premium: boolean
  subscription?: {
    plan: string,
    expires_at: string
    status: string
  },
    created_at: string,
  updated_at: string
}

interface FantasticalCalendar {
  id: string,
  name: string
  color: string,
  type: 'local' | 'icloud' | 'google' | 'exchange' | 'caldav'
  source: string,
  read_only: boolean
  visible: boolean,
  sync_enabled: boolean
  last_sync: string
  account_id?: string
  settings: {,
    default_alert: number
    default_travel_time: number,
    auto_location: boolean
  }

interface FantasticalEvent {
  id: string,
  calendar_id: string
  title: string
  notes?: string
  location?: string
  url?: string
  start_date: string,
  end_date: string
  all_day: boolean,
  timezone: string
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: number
    count?: number
    until?: string
    by_day?: string[],
    by_month_day?: number[]
  }
  attendees?: Array<{
    name: string,
    email: string
    status: 'pending' | 'accepted' | 'declined' | 'tentative',
    role: 'required' | 'optional' | 'organizer'
  }>
  alerts?: Array<{
    type: 'email' | 'popup',
    trigger: number // minutes before event
  }>
  status: 'confirmed' | 'tentative' | 'cancelled'
  organizer?: {
    name: string,
    email: string
  },
    created_at: string,
  updated_at: string
  tags?: string[]
  travel_time?: number
  conference?: {
    type: 'zoom' | 'teams' | 'meet' | 'webex' | 'custom',
    url: string
    phone?: string,
    id?: string
  }

interface FantasticalTask {
  id: string,
  title: string
  notes?: string
  completed: boolean,
  priority: 'none' | 'low' | 'medium' | 'high'
  due_date?: string
  reminder_date?: string
  tags?: string[]
  project?: string
  context?: string
  created_at: string,
  updated_at: string
  completed_at?: string
  calendar_id?: string
  location?: string,
  url?: string
}

interface FantasticalTemplate {
  id: string,
  name: string
  type: 'event' | 'task',
  content: {
    title: string
    duration?: number
    location?: string
    notes?: string
    alerts?: Array<{ trigger: number }>
    tags?: string[]
  },
    created_at: string,
  updated_at: string
  usage_count: number
}

export class FantasticalIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'fantastical'
  readonly name = 'Fantastical'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'Calendar Management',
      description: 'Access and manage calendar data'
      enabled: true,
      requiredScopes: ['calendars:read', 'calendars:write']},
    {
      name: 'Event Management',
      description: 'Create, update, and delete calendar events',
      enabled: true,
      requiredScopes: ['events:read', 'events:write']},
    {
      name: 'Task Management',
      description: 'Manage tasks and to-do items'
      enabled: true,
      requiredScopes: ['tasks:read', 'tasks:write']},
    {
      name: 'Smart Scheduling',
      description: 'Intelligent scheduling and time management'
      enabled: true,
      requiredScopes: ['scheduling:read', 'scheduling:write']},
    {
      name: 'Reminder Management',
      description: 'Create and manage reminders'
      enabled: true,
      requiredScopes: ['reminders:read', 'reminders:write']},
    {
      name: 'Template System',
      description: 'Use and manage event templates'
      enabled: true,
      requiredScopes: ['templates:read', 'templates:write']},
    {
      name: 'Natural Language Processing',
      description: 'Parse natural language for event creation'
      enabled: true,
      requiredScopes: ['nlp:read']},
    {
      name: 'Cross-Platform Sync',
      description: 'Synchronize data across devices'
      enabled: true,
      requiredScopes: ['sync:read', 'sync:write']},
  ]

  private calendarsCache: Map<string, FantasticalCalendar[]> = new Map()
  private eventsCache: Map<string, FantasticalEvent[]> = new Map()
  private tasksCache: Map<string, FantasticalTask[]> = new Map()
  private templatesCache: Map<string, FantasticalTemplate[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      this.validateAccessToken()
  }

      const _userProfile = await this.getCurrentUser(this.accessToken)

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000)
        scope: [
          'calendars:read',
          'calendars:write',
          'events:read',
          'events:write',
          'tasks:read',
          'tasks:write',
        ]}
    } catch (error) {
      this.logError('authenticate', error)
      return {
        success: false,
        error: `Authentication failed: ${error.message}`}

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        throw new Error('No refresh token available')
      }
  }

      // Fantastical API doesn't typically use refresh tokens, return current token
      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000)}
    } catch (error) {
      this.logError('refreshToken', error)
      return {
        success: false,
        error: `Token refresh failed: ${error.message}`}

  async revokeAccess(): Promise<boolean> {
    try {
      // Fantastical doesn't have a specific revocation endpoint
      // In practice, the user would revoke access from their Fantastical account
      this.logInfo(
        'revokeAccess',
        'Access revoked locally (user must revoke from Fantastical settings)',
      ),
      return true
    } catch (error) {
      this.logError('revokeAccess' error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _userProfile = await this.getCurrentUser(this.accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        rateLimitInfo: await this.checkRateLimit()}
    } catch (error) {
      this.logError('testConnection', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message}

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const availableScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => availableScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      const results = await Promise.allSettled([
        this.syncCalendars(this.accessToken),
        this.syncRecentEvents(this.accessToken),
        this.syncTasks(this.accessToken),
        this.syncTemplates(this.accessToken),
      ])
  }

      const calendarsResult = results[0]
      const eventsResult = results[1]
      const tasksResult = results[2]
      const templatesResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message)

      const itemsProcessed = results
        .filter(result => result.status === 'fulfilled')
        .reduce((total, result) => {
          const value = (result as PromiseFulfilledResult<unknown>).value
          return total + (Array.isArray(value) ? value.length : 0)
        }, 0)

      if (errors.length === results.length) {
        return {
          success: false,
          itemsProcessed: 0
          itemsSkipped: 0
          errors}
      }

      return {
        success: true
        itemsProcessed,
        itemsSkipped: 0
        errors,
        metadata: {,
          calendars: calendarsResult.status === 'fulfilled' ? calendarsResult.value : []
          events: eventsResult.status === 'fulfilled' ? eventsResult.value : [],
          tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : []
          templates: templatesResult.status === 'fulfilled' ? templatesResult.value : [],
          syncedAt: new Date().toISOString()}
    } catch (error) {
      this.logError('syncData', error)
      return {
        success: false,
        itemsProcessed: 0
        itemsSkipped: 0,
        errors: [error.message]}

  async getLastSyncTime(): Promise<Date | null> {
    // This would typically be stored in the database
    // For now, return null to indicate no previous sync,
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Fantastical webhook')
  }

      const data = payload.data
      const eventType = payload.event

      switch (eventType) {
        case 'event.created':
        case 'event.updated':
        case 'event.deleted':
          await this.handleEventChange(data)
          break
        case 'task.created':
        case 'task.updated':
        case 'task.completed':
          await this.handleTaskChange(data)
          break
        case 'calendar.created':
        case 'calendar.updated':
          await this.handleCalendarChange(data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error),
      throw error
    }

    catch (error) {
      console.error('Error in fantastical.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      // Fantastical webhook signature validation would go here
      // For now, return true as we don't have the webhook secret,
      return true
    } catch (error) {
      this.logError('validateWebhookSignature' error),
      return false
    }

  // User Management
  async getCurrentUser(accessToken?: string): Promise<FantasticalUser> {
    const token = accessToken || this.accessToken
  }

    const _response = await this.makeRequest('/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return response
  }

  // Calendar Management
  async getCalendars(accessToken?: string): Promise<FantasticalCalendar[]> {
    const token = accessToken || this.accessToken
    const cacheKey = 'calendars_all'
  }

    if (this.calendarsCache.has(cacheKey)) {
      return this.calendarsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/calendars', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const calendars = response.calendars || []
    this.calendarsCache.set(cacheKey, calendars),
    return calendars
  }

  async getCalendar(calendarId: string, accessToken?: string): Promise<FantasticalCalendar> {
    const token = accessToken || this.accessToken
  }

    const _response = await this.makeRequest(`/calendars/${calendarId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return response
  }

  async updateCalendarSettings(
    calendarId: string,
    settings: Partial<FantasticalCalendar['settings']>
    accessToken?: string,
  ): Promise<FantasticalCalendar> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/calendars/${calendarId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ settings })})

    return response
  }

  // Event Management
  async getEvents(
    calendarId?: string,
    startDate?: string,
    endDate?: string,
    accessToken?: string,
  ): Promise<FantasticalEvent[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `events_${calendarId || 'all'}_${startDate || 'any'}_${endDate || 'any'}`

    if (this.eventsCache.has(cacheKey)) {
      return this.eventsCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (calendarId) params.calendar_id = calendarId
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const _response = await this.makeRequest('/events', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const events = response.events || []
    this.eventsCache.set(cacheKey, events),
    return events
  }

  async createEvent(
    event: {,
      calendar_id: string
      title: string,
      start_date: string
      end_date: string
      all_day?: boolean
      notes?: string
      location?: string
      alerts?: Array<{ trigger: number }>
      attendees?: Array<{ email: string; name?: string }>
    },
    accessToken?: string,
  ): Promise<FantasticalEvent> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest('/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(_event)})

    return response
  }

  async updateEvent(
    eventId: string,
    updates: Partial<FantasticalEvent>
    accessToken?: string,
  ): Promise<FantasticalEvent> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    return response
  }

  async deleteEvent(eventId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || this.accessToken
  }

    await this.makeRequest(`/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return true
  }

  // Task Management
  async getTasks(
    completed?: boolean,
    calendarId?: string,
    accessToken?: string,
  ): Promise<FantasticalTask[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `tasks_${completed !== undefined ? completed : 'all'}_${calendarId || 'all'}`

    if (this.tasksCache.has(cacheKey)) {
      return this.tasksCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (completed !== undefined) params.completed = completed
    if (calendarId) params.calendar_id = calendarId

    const _response = await this.makeRequest('/tasks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const tasks = response.tasks || []
    this.tasksCache.set(cacheKey, tasks),
    return tasks
  }

  async createTask(
    task: {,
      title: string
      notes?: string
      due_date?: string
      priority?: 'none' | 'low' | 'medium' | 'high'
      tags?: string[],
      calendar_id?: string
    },
    accessToken?: string,
  ): Promise<FantasticalTask> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest('/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(task)})

    return response
  }

  async updateTask(
    taskId: string,
    updates: Partial<FantasticalTask>
    accessToken?: string,
  ): Promise<FantasticalTask> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    return response
  }

  async completeTask(taskId: string, accessToken?: string): Promise<FantasticalTask> {
    return this.updateTask(taskId, { completed: true }, accessToken)
  }

  // Template Management
  async getTemplates(
    type?: 'event' | 'task',
    accessToken?: string,
  ): Promise<FantasticalTemplate[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `templates_${type || 'all'}`

    if (this.templatesCache.has(cacheKey)) {
      return this.templatesCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (type) params.type = type

    const _response = await this.makeRequest('/templates', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const templates = response.templates || []
    this.templatesCache.set(cacheKey, templates),
    return templates
  }

  async createTemplate(
    template: {,
      name: string
      type: 'event' | 'task',
      content: FantasticalTemplate['content']
    },
    accessToken?: string,
  ): Promise<FantasticalTemplate> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest('/templates', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(template)})

    return response
  }

  // Natural Language Processing
  async parseNaturalLanguage(
    text: string
    timezone?: string,
    accessToken?: string,
  ): Promise<{
    type: 'event' | 'task',
    parsed: Partial<FantasticalEvent | FantasticalTask>
    confidence: number
  }> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest('/parse', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ text, timezone })}),

    return response
  }

  // Quick Actions
  async quickAdd(
    text: string
    calendarId?: string,
    accessToken?: string,
  ): Promise<FantasticalEvent | FantasticalTask> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest('/quick-add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ text, calendar_id: calendarId })}),

    return response
  }

  // Helper Methods
  private async syncCalendars(accessToken: string): Promise<FantasticalCalendar[]> {
    return this.getCalendars(accessToken)
  }

  private async syncRecentEvents(accessToken: string): Promise<FantasticalEvent[]> {
    const startDate = new Date().toISOString()
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Next 30 days
    return this.getEvents(undefined, startDate, endDate, accessToken)
  }

  private async syncTasks(accessToken: string): Promise<FantasticalTask[]> {
    return this.getTasks(false, undefined, accessToken) // Only incomplete tasks
  }

  private async syncTemplates(accessToken: string): Promise<FantasticalTemplate[]> {
    return this.getTemplates(undefined, accessToken)
  }

  private async handleEventChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logInfo('handleEventChange', `Processing _event change: ${data.type}`)
      this.eventsCache.clear()
    } catch (error) {
      this.logError('handleEventChange', error)
    }

  private async handleTaskChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logInfo('handleTaskChange', `Processing task change: ${data.type}`)
      this.tasksCache.clear()
    } catch (error) {
      this.logError('handleTaskChange', error)
    }

  private async handleCalendarChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logInfo('handleCalendarChange', `Processing calendar change: ${data.type}`)
      this.calendarsCache.clear()
    } catch (error) {
      this.logError('handleCalendarChange', error)
    }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.flexibits.com/v1${endpoint}`

    const { params, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : { status: response.status }

  clearCache(): void {
    this.calendarsCache.clear()
    this.eventsCache.clear()
    this.tasksCache.clear()
    this.templatesCache.clear()
  }

}