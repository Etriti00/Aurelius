import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSession } from 'next-auth/react'
import { WebSocketEvent, NotificationData, WebSocketEventType } from '../api/types'

// Enhanced WebSocket configuration
interface WebSocketConfig {
  url: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
  pingInterval: number;
  pingTimeout: number;
  upgradeTimeout: number;
  maxBufferSize: number;
}

// Enhanced WebSocket connection status
export interface WebSocketStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  reconnectAttempts: number
  lastConnected?: string
  serverTime?: string
}

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private isConnecting = false
  private connectionId: string | null = null
  private lastPingTime = 0
  private pingLatency = 0
  private eventQueue: Array<{ event: string; data: Record<string, unknown> }> = []
  private messageBuffer = new Map<string, unknown>()
  private connectionMetrics = {
    totalConnections: 0,
    totalReconnections: 0,
    totalErrors: 0,
    totalMessages: 0,
    averageLatency: 0,
    uptime: 0,
    startTime: Date.now(),
  }
  
  private config: WebSocketConfig = {
    url: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001',
    reconnectionAttempts: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECTION_ATTEMPTS || '5', 10),
    reconnectionDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECTION_DELAY || '5000', 10),
    timeout: parseInt(process.env.NEXT_PUBLIC_WS_TIMEOUT || '20000', 10),
    pingInterval: parseInt(process.env.NEXT_PUBLIC_WS_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.NEXT_PUBLIC_WS_PING_TIMEOUT || '60000', 10),
    upgradeTimeout: parseInt(process.env.NEXT_PUBLIC_WS_UPGRADE_TIMEOUT || '10000', 10),
    maxBufferSize: parseInt(process.env.NEXT_PUBLIC_WS_MAX_BUFFER_SIZE || '1000', 10),
  }

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(this.socket)
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }

    this.isConnecting = true

    try {
      // Get authentication token
      const session = await getSession()
      
      // Handle auth refresh if needed
      if (session?.error === 'RefreshAccessTokenError') {
        // Auth token refresh failed, connecting without auth
      }
      
      const token = session?.accessToken
      const userId = session?.user?.id

      this.socket = io(this.config.url, {
        auth: token ? { token, userId } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        timeout: this.config.timeout,
        forceNew: true, // Force new connection to ensure fresh auth
        
        // Enhanced configuration
        rememberUpgrade: true,
        autoConnect: true,
        randomizationFactor: 0.5,
      })

      // Setup event listeners
      this.setupEventListeners()

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create socket'))
          return
        }

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0
          this.isConnecting = false
          this.connectionId = this.socket?.id || null
          this.connectionMetrics.totalConnections++
          this.connectionMetrics.uptime = Date.now() - this.connectionMetrics.startTime
          
          // Process queued events
          this.processEventQueue()
          
          // Start ping monitoring
          this.startPingMonitoring()
          
          // WebSocket connected successfully
          resolve(this.socket!)
        })

        this.socket.on('connect_error', (error) => {
          this.isConnecting = false
          this.connectionMetrics.totalErrors++
          // WebSocket connection error
          reject(error)
        })

        // Enhanced auth error handling
        this.socket.on('auth_error', (error) => {
          // WebSocket auth error
          this.isConnecting = false
          reject(new Error(`Authentication failed: ${error.message}`))
        })

        // Timeout fallback
        setTimeout(() => {
          if (!this.socket?.connected) {
            this.isConnecting = false
            reject(new Error('Connection timeout'))
          }
        }, 10000)
      })
    } catch (error) {
      this.isConnecting = false
      throw error
    }
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('disconnect', (reason) => {
      this.connectionId = null
      this.stopPingMonitoring()
      
      // WebSocket disconnected
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Server initiated disconnect or auth issues, try to reconnect
        this.reconnect()
      }
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber
      // WebSocket reconnection attempt
    })

    this.socket.on('reconnect', () => {
      this.reconnectAttempts = 0
      this.connectionMetrics.totalReconnections++
      this.processEventQueue()
      // WebSocket reconnected successfully
    })

    this.socket.on('reconnect_failed', () => {
      // WebSocket reconnection failed after max attempts
    })

    // Enhanced server event handling
    this.socket.on('server_time', (data: { timestamp: string }) => {
      // Handle server time sync for better event ordering
      this.synchronizeTime(data.timestamp)
    })

    this.socket.on('user_session_updated', (data: Record<string, unknown>) => {
      // Handle user session updates (subscription changes, etc.)
      this.handleSessionUpdate(data)
    })
    
    // Performance monitoring events
    this.socket.on('pong', (latency: number) => {
      this.handlePongResponse(latency)
    })
    
    // Message acknowledgment for reliability
    this.socket.on('message_ack', (data: { messageId: string; status: string }) => {
      this.handleMessageAck(data.messageId, data.status)
    })
    
    // Connection quality monitoring
    this.socket.on('connection_quality', (data: { latency: number; quality: string }) => {
      this.updateConnectionQuality(data)
    })
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed silently
      })
    }, this.reconnectInterval)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  emit(event: string, data: Record<string, unknown>, options?: { reliable?: boolean; priority?: 'low' | 'medium' | 'high' }) {
    const messageId = this.generateMessageId()
    const message = {
      id: messageId,
      event,
      data,
      timestamp: new Date().toISOString(),
      priority: options?.priority || 'medium',
    }
    
    if (this.socket?.connected) {
      this.socket.emit(event, message)
      this.connectionMetrics.totalMessages++
      
      // Store for acknowledgment if reliable delivery is requested
      if (options?.reliable) {
        this.messageBuffer.set(messageId, { ...message, retryCount: 0 })
      }
    } else {
      // Queue event for later delivery if not connected
      if (this.eventQueue.length < this.config.maxBufferSize) {
        this.eventQueue.push({ event, data })
      } else {
        console.warn('WebSocket event queue is full, dropping event:', event)
      }
    }
    
    return messageId
  }

  on(event: string, callback: ((data: Record<string, unknown>) => void) | ((error: Error) => void)) {
    if (this.socket) {
      this.socket.on(event, callback as (data: Record<string, unknown> | Error) => void)
    }
  }

  off(event: string, callback?: ((data: Record<string, unknown>) => void) | ((error: Error) => void)) {
    if (this.socket) {
      this.socket.off(event, callback as ((data: Record<string, unknown> | Error) => void) | undefined)
    }
  }

  // Type-safe event listeners for specific event types
  onTypedEvent(event: WebSocketEventType, callback: (data: WebSocketEvent) => void) {
    this.on(event, callback as unknown as (data: Record<string, unknown>) => void)
  }

  offTypedEvent(event: WebSocketEventType, callback?: (data: WebSocketEvent) => void) {
    this.off(event, callback as ((data: Record<string, unknown>) => void) | undefined)
  }

  // Get enhanced connection status
  getStatus(): WebSocketStatus {
    return {
      connected: this.socket?.connected || false,
      connecting: this.isConnecting,
      error: null, // Could be enhanced to track last error
      reconnectAttempts: this.reconnectAttempts,
      lastConnected: this.socket?.connected ? new Date().toISOString() : undefined,
      serverTime: undefined, // Set by server time sync
    }
  }
  
  // Get connection metrics
  getMetrics() {
    return {
      ...this.connectionMetrics,
      currentLatency: this.pingLatency,
      queueSize: this.eventQueue.length,
      bufferSize: this.messageBuffer.size,
      connectionId: this.connectionId,
    }
  }
  
  // Enhanced connection quality information
  getConnectionQuality(): { quality: 'excellent' | 'good' | 'fair' | 'poor'; latency: number; stability: number } {
    const stability = this.connectionMetrics.totalConnections > 0 
      ? 1 - (this.connectionMetrics.totalReconnections / this.connectionMetrics.totalConnections)
      : 1
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent'
    
    if (this.pingLatency > 500 || stability < 0.8) {
      quality = 'poor'
    } else if (this.pingLatency > 200 || stability < 0.9) {
      quality = 'fair'
    } else if (this.pingLatency > 100 || stability < 0.95) {
      quality = 'good'
    }
    
    return {
      quality,
      latency: this.pingLatency,
      stability,
    }
  }
  
  // Private helper methods
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  private processEventQueue(): void {
    while (this.eventQueue.length > 0 && this.socket?.connected) {
      const { event, data } = this.eventQueue.shift()!
      this.emit(event, data)
    }
  }
  
  private startPingMonitoring(): void {
    if (this.socket?.connected) {
      this.lastPingTime = Date.now()
      this.socket.emit('ping')
    }
  }
  
  private stopPingMonitoring(): void {
    // Reset ping monitoring state
    this.lastPingTime = 0
    this.pingLatency = 0
  }
  
  private handlePongResponse(latency: number): void {
    this.pingLatency = latency
    this.connectionMetrics.averageLatency = 
      (this.connectionMetrics.averageLatency + latency) / 2
  }
  
  private handleMessageAck(messageId: string, status: string): void {
    if (status === 'received') {
      this.messageBuffer.delete(messageId)
    } else if (status === 'failed') {
      // Retry message if it failed
      const message = this.messageBuffer.get(messageId) as { event: string; retryCount: number; [key: string]: unknown }
      if (message && message.retryCount < 3) {
        message.retryCount++
        setTimeout(() => {
          if (this.socket?.connected) {
            this.socket.emit(message.event, message)
          }
        }, 1000 * Math.pow(2, message.retryCount)) // Exponential backoff
      } else {
        this.messageBuffer.delete(messageId)
      }
    }
  }
  
  private synchronizeTime(serverTimestamp: string): void {
    // Store time offset for better event ordering
    // This could be used to adjust timestamps in events
    // const serverTime = new Date(serverTimestamp).getTime()
    // const localTime = Date.now()
    // const offset = serverTime - localTime
    
    // Currently not implemented - placeholder for future time sync functionality
    void serverTimestamp
  }
  
  private handleSessionUpdate(data: Record<string, unknown>): void {
    // Handle user session updates (subscription changes, etc.)
    // Could trigger UI updates or other side effects
    // Handle session update logic here if needed
    void data
  }
  
  private updateConnectionQuality(data: { latency: number; quality: string }): void {
    this.pingLatency = data.latency
    // Could trigger UI updates based on connection quality
  }

  get connected(): boolean {
    return this.socket?.connected || false
  }

  get connecting(): boolean {
    return this.isConnecting
  }

  get reconnectAttempt(): number {
    return this.reconnectAttempts
  }
}

// Singleton instance
const websocketService = new WebSocketService()

// React hook for WebSocket connection
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      if (!mounted) return

      setIsConnecting(true)
      setError(null)

      try {
        await websocketService.connect()
        if (mounted) {
          setIsConnected(true)
          setIsConnecting(false)
        }
      } catch (error) {
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Connection failed')
          setIsConnected(false)
          setIsConnecting(false)
        }
      }
    }

    const handleConnect = () => {
      if (mounted) {
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        setReconnectAttempts(0)
      }
    }

    const handleDisconnect = () => {
      if (mounted) {
        setIsConnected(false)
        setReconnectAttempts(websocketService.reconnectAttempt)
      }
    }

    const handleConnectError = (error: Error) => {
      if (mounted) {
        setError(error.message || 'Connection error')
        setIsConnected(false)
        setIsConnecting(false)
      }
    }

    // Initial connection
    connect()

    // Setup event listeners
    websocketService.on('connect', handleConnect)
    websocketService.on('disconnect', handleDisconnect)
    websocketService.on('connect_error', handleConnectError)

    return () => {
      mounted = false
      websocketService.off('connect', handleConnect)
      websocketService.off('disconnect', handleDisconnect)
      websocketService.off('connect_error', handleConnectError)
      websocketService.disconnect()
    }
  }, [])

  const emit = useCallback((event: string, data: Record<string, unknown>, options?: { reliable?: boolean; priority?: 'low' | 'medium' | 'high' }) => {
    return websocketService.emit(event, data, options)
  }, [])

  const subscribe = useCallback((event: string, callback: (data: Record<string, unknown>) => void) => {
    websocketService.on(event, callback)
    return () => websocketService.off(event, callback)
  }, [])

  const getMetrics = useCallback(() => {
    return websocketService.getMetrics()
  }, [])
  
  const getConnectionQuality = useCallback(() => {
    return websocketService.getConnectionQuality()
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    emit,
    subscribe,
    getMetrics,
    getConnectionQuality,
    service: websocketService,
  }
}

// Hook for real-time notifications
export const useWebSocketNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data: Record<string, unknown>) => {
      const notification = data as unknown as NotificationData
      setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10 notifications
    })

    return unsubscribe
  }, [subscribe])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return {
    notifications,
    clearNotifications,
    dismissNotification,
  }
}

// Hook for real-time data updates
export const useWebSocketUpdates = () => {
  const { subscribe } = useWebSocket()

  const subscribeToTaskUpdates = useCallback((callback: (task: Record<string, unknown>) => void) => {
    const unsubscribeCreated = subscribe('task:created', callback)
    const unsubscribeUpdated = subscribe('task:updated', callback)
    const unsubscribeCompleted = subscribe('task:completed', callback)
    const unsubscribeDeleted = subscribe('task:deleted', callback)
    
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeCompleted()
      unsubscribeDeleted()
    }
  }, [subscribe])

  const subscribeToEmailUpdates = useCallback((callback: (email: Record<string, unknown>) => void) => {
    const unsubscribeReceived = subscribe('email:received', callback)
    const unsubscribeRead = subscribe('email:read', callback)
    const unsubscribeArchived = subscribe('email:archived', callback)
    
    return () => {
      unsubscribeReceived()
      unsubscribeRead()
      unsubscribeArchived()
    }
  }, [subscribe])

  const subscribeToCalendarUpdates = useCallback((callback: (event: Record<string, unknown>) => void) => {
    const unsubscribeCreated = subscribe('calendar:event:created', callback)
    const unsubscribeUpdated = subscribe('calendar:event:updated', callback)
    const unsubscribeReminder = subscribe('calendar:event:reminder', callback)
    
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeReminder()
    }
  }, [subscribe])

  const subscribeToAIUpdates = useCallback((callback: (data: Record<string, unknown>) => void) => {
    const unsubscribeSuggestion = subscribe('ai:suggestion:new', callback)
    const unsubscribeInsight = subscribe('ai:insight:generated', callback)
    const unsubscribeProcessingStarted = subscribe('ai:processing:started', callback)
    const unsubscribeProcessingCompleted = subscribe('ai:processing:completed', callback)
    const unsubscribeProcessingFailed = subscribe('ai:processing:failed', callback)
    
    return () => {
      unsubscribeSuggestion()
      unsubscribeInsight()
      unsubscribeProcessingStarted()
      unsubscribeProcessingCompleted()
      unsubscribeProcessingFailed()
    }
  }, [subscribe])

  const subscribeToIntegrationUpdates = useCallback((callback: (data: Record<string, unknown>) => void) => {
    const unsubscribeConnected = subscribe('integration:connected', callback)
    const unsubscribeDisconnected = subscribe('integration:disconnected', callback)
    const unsubscribeSyncStarted = subscribe('integration:sync:started', callback)
    const unsubscribeSyncCompleted = subscribe('integration:sync:completed', callback)
    const unsubscribeSyncFailed = subscribe('integration:sync:failed', callback)
    
    return () => {
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeSyncStarted()
      unsubscribeSyncCompleted()
      unsubscribeSyncFailed()
    }
  }, [subscribe])

  const subscribeToBillingUpdates = useCallback((callback: (data: Record<string, unknown>) => void) => {
    const unsubscribeSubscriptionUpdated = subscribe('billing:subscription:updated', callback)
    const unsubscribeUsageWarning = subscribe('billing:usage:warning', callback)
    
    return () => {
      unsubscribeSubscriptionUpdated()
      unsubscribeUsageWarning()
    }
  }, [subscribe])

  const subscribeToSystemUpdates = useCallback((callback: (data: Record<string, unknown>) => void) => {
    const unsubscribeMaintenance = subscribe('system:maintenance', callback)
    const unsubscribeError = subscribe('system:error', callback)
    
    return () => {
      unsubscribeMaintenance()
      unsubscribeError()
    }
  }, [subscribe])

  return {
    subscribeToTaskUpdates,
    subscribeToEmailUpdates,
    subscribeToCalendarUpdates,
    subscribeToAIUpdates,
    subscribeToIntegrationUpdates,
    subscribeToBillingUpdates,
    subscribeToSystemUpdates,
  }
}

export default websocketService