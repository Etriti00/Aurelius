import { renderHook, act } from '@testing-library/react'
import { useWebSocket, useWebSocketNotifications, useWebSocketUpdates } from '../websocket.service'

// Mock Socket.IO
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn().mockResolvedValue({
    accessToken: 'test-token',
  }),
}))

describe('WebSocket Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSocket.connected = false
  })

  describe('useWebSocket', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWebSocket())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.reconnectAttempts).toBe(0)
    })

    it('should handle successful connection', async () => {
      const { result } = renderHook(() => useWebSocket())

      await act(async () => {
        // Simulate successful connection
        mockSocket.connected = true
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          connectHandler()
        }
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle connection error', async () => {
      const { result } = renderHook(() => useWebSocket())

      await act(async () => {
        // Simulate connection error
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect_error'
        )?.[1]
        if (errorHandler) {
          errorHandler({ message: 'Connection failed' })
        }
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection failed')
    })

    it('should handle disconnection', async () => {
      const { result } = renderHook(() => useWebSocket())

      // First connect
      await act(async () => {
        mockSocket.connected = true
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          connectHandler()
        }
      })

      // Then disconnect
      await act(async () => {
        mockSocket.connected = false
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1]
        if (disconnectHandler) {
          disconnectHandler('transport close')
        }
      })

      expect(result.current.isConnected).toBe(false)
    })

    it('should provide emit function', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.emit('test-event', { data: 'test' })
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should provide subscribe function', () => {
      const { result } = renderHook(() => useWebSocket())
      const mockCallback = jest.fn()

      act(() => {
        const unsubscribe = result.current.subscribe('test-event', mockCallback)
        expect(mockSocket.on).toHaveBeenCalledWith('test-event', mockCallback)
        
        // Test unsubscribe
        unsubscribe()
        expect(mockSocket.off).toHaveBeenCalledWith('test-event', mockCallback)
      })
    })
  })

  describe('useWebSocketNotifications', () => {
    it('should manage notifications state', () => {
      const { result } = renderHook(() => useWebSocketNotifications())

      expect(result.current.notifications).toEqual([])
      expect(typeof result.current.clearNotifications).toBe('function')
      expect(typeof result.current.dismissNotification).toBe('function')
    })

    it('should add new notifications', async () => {
      const { result } = renderHook(() => useWebSocketNotifications())

      const mockNotification = {
        id: '1',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info' as const,
        createdAt: new Date().toISOString(),
      }

      await act(async () => {
        // Simulate notification received
        const notificationHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'notification'
        )?.[1]
        if (notificationHandler) {
          notificationHandler(mockNotification)
        }
      })

      expect(result.current.notifications).toContain(mockNotification)
    })

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useWebSocketNotifications())

      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.notifications).toEqual([])
    })

    it('should dismiss specific notification', async () => {
      const { result } = renderHook(() => useWebSocketNotifications())

      const mockNotification = {
        id: '1',
        title: 'Test',
        message: 'Test',
        type: 'info' as const,
        createdAt: new Date().toISOString(),
      }

      // Add notification
      await act(async () => {
        const notificationHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'notification'
        )?.[1]
        if (notificationHandler) {
          notificationHandler(mockNotification)
        }
      })

      // Dismiss notification
      act(() => {
        result.current.dismissNotification('1')
      })

      expect(result.current.notifications).not.toContain(mockNotification)
    })

    it('should limit notifications to 10', async () => {
      const { result } = renderHook(() => useWebSocketNotifications())

      await act(async () => {
        const notificationHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'notification'
        )?.[1]
        
        if (notificationHandler) {
          // Add 12 notifications
          for (let i = 0; i < 12; i++) {
            notificationHandler({
              id: i.toString(),
              title: `Notification ${i}`,
              message: `Message ${i}`,
              type: 'info' as const,
              createdAt: new Date().toISOString(),
            })
          }
        }
      })

      expect(result.current.notifications).toHaveLength(10)
    })
  })

  describe('useWebSocketUpdates', () => {
    it('should provide subscription functions', () => {
      const { result } = renderHook(() => useWebSocketUpdates())

      expect(typeof result.current.subscribeToTaskUpdates).toBe('function')
      expect(typeof result.current.subscribeToEmailUpdates).toBe('function')
      expect(typeof result.current.subscribeToCalendarUpdates).toBe('function')
      expect(typeof result.current.subscribeToAIUpdates).toBe('function')
    })

    it('should handle task update subscriptions', () => {
      const { result } = renderHook(() => useWebSocketUpdates())
      const mockCallback = jest.fn()

      act(() => {
        const unsubscribe = result.current.subscribeToTaskUpdates(mockCallback)
        expect(mockSocket.on).toHaveBeenCalledWith('task:updated', mockCallback)
        
        unsubscribe()
        expect(mockSocket.off).toHaveBeenCalledWith('task:updated', mockCallback)
      })
    })

    it('should handle email update subscriptions', () => {
      const { result } = renderHook(() => useWebSocketUpdates())
      const mockCallback = jest.fn()

      act(() => {
        const unsubscribe = result.current.subscribeToEmailUpdates(mockCallback)
        expect(mockSocket.on).toHaveBeenCalledWith('email:received', mockCallback)
        
        unsubscribe()
        expect(mockSocket.off).toHaveBeenCalledWith('email:received', mockCallback)
      })
    })

    it('should handle calendar update subscriptions', () => {
      const { result } = renderHook(() => useWebSocketUpdates())
      const mockCallback = jest.fn()

      act(() => {
        const unsubscribe = result.current.subscribeToCalendarUpdates(mockCallback)
        expect(mockSocket.on).toHaveBeenCalledWith('calendar:updated', mockCallback)
        
        unsubscribe()
        expect(mockSocket.off).toHaveBeenCalledWith('calendar:updated', mockCallback)
      })
    })

    it('should handle AI insights subscriptions', () => {
      const { result } = renderHook(() => useWebSocketUpdates())
      const mockCallback = jest.fn()

      act(() => {
        const unsubscribe = result.current.subscribeToAIUpdates(mockCallback)
        expect(mockSocket.on).toHaveBeenCalledWith('ai:insight', mockCallback)
        
        unsubscribe()
        expect(mockSocket.off).toHaveBeenCalledWith('ai:insight', mockCallback)
      })
    })
  })
})