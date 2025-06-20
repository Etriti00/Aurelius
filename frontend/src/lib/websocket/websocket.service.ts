import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSession } from 'next-auth/react'
import { WebSocketEvent, NotificationData, WebSocketEventType } from '../api/types'

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

      const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      
      this.socket = io(socketUrl, {
        auth: token ? { token, userId } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 10000,
        forceNew: true, // Force new connection to ensure fresh auth
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
          // WebSocket connected successfully
          resolve(this.socket!)
        })

        this.socket.on('connect_error', (error) => {
          this.isConnecting = false
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
      // WebSocket reconnected successfully
    })

    this.socket.on('reconnect_failed', () => {
      // WebSocket reconnection failed after max attempts
    })

    // Enhanced server event handling
    this.socket.on('server_time', () => {
      // Handle server time sync for better event ordering
      // Server time sync
    })

    this.socket.on('user_session_updated', () => {
      // Handle user session updates (subscription changes, etc.)
      // User session updated
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

  emit(event: string, data: Record<string, unknown>) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
    // If not connected, event is dropped silently
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

  // Get connection status
  getStatus(): WebSocketStatus {
    return {
      connected: this.socket?.connected || false,
      connecting: this.isConnecting,
      error: null, // Could be enhanced to track last error
      reconnectAttempts: this.reconnectAttempts,
      lastConnected: this.socket?.connected ? new Date().toISOString() : undefined,
    }
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

  const emit = useCallback((event: string, data: Record<string, unknown>) => {
    websocketService.emit(event, data)
  }, [])

  const subscribe = useCallback((event: string, callback: (data: Record<string, unknown>) => void) => {
    websocketService.on(event, callback)
    return () => websocketService.off(event, callback)
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    emit,
    subscribe,
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