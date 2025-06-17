import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getSession } from 'next-auth/react'

export interface WebSocketEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, unknown>
  createdAt: string
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
      const token = session?.accessToken

      const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      
      this.socket = io(socketUrl, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 10000,
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
          resolve(this.socket!)
        })

        this.socket.on('connect_error', (error) => {
          this.isConnecting = false
          reject(error)
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
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.reconnect()
      }
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber
    })

    this.socket.on('reconnect', () => {
      this.reconnectAttempts = 0
    })

    this.socket.on('reconnect_failed', () => {
      // Reconnection failed
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
    return subscribe('task:updated', callback)
  }, [subscribe])

  const subscribeToEmailUpdates = useCallback((callback: (email: Record<string, unknown>) => void) => {
    return subscribe('email:received', callback)
  }, [subscribe])

  const subscribeToCalendarUpdates = useCallback((callback: (event: Record<string, unknown>) => void) => {
    return subscribe('calendar:updated', callback)
  }, [subscribe])

  const subscribeToAIInsights = useCallback((callback: (insight: Record<string, unknown>) => void) => {
    return subscribe('ai:insight', callback)
  }, [subscribe])

  return {
    subscribeToTaskUpdates,
    subscribeToEmailUpdates,
    subscribeToCalendarUpdates,
    subscribeToAIInsights,
  }
}

export default websocketService