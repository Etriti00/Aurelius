import { renderHook, act } from '@testing-library/react'
import { useAICommand, getCommandSuggestions, formatAIResponse } from '../ai'

// Mock the API client
jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

describe('AI API', () => {
  const mockApiClient = jest.requireMock('../client').apiClient

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useAICommand', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAICommand())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.execute).toBe('function')
      expect(typeof result.current.processCommand).toBe('function')
      expect(typeof result.current.generateResponse).toBe('function')
    })

    it('should handle successful command execution', async () => {
      const mockResponse = {
        content: 'Task created successfully',
        tokens: 150,
        cost: 0.02,
        cached: false,
      }
      
      mockApiClient.post.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAICommand())

      let executeResult: unknown
      await act(async () => {
        executeResult = await result.current.execute({
          command: 'create a new task',
          context: { source: 'dashboard' },
        })
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-gateway/process', {
        command: 'create a new task',
        context: { source: 'dashboard' },
      })
      expect(executeResult).toEqual(mockResponse)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle command execution failure', async () => {
      const mockError = new Error('API Error')
      mockApiClient.post.mockRejectedValue(mockError)

      const { result } = renderHook(() => useAICommand())

      await act(async () => {
        try {
          await result.current.execute({
            command: 'invalid command',
            context: {},
          })
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('API Error')
    })

    it('should set loading state during execution', async () => {
      let resolvePromise: (value: unknown) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockApiClient.post.mockReturnValue(mockPromise)

      const { result } = renderHook(() => useAICommand())

      act(() => {
        result.current.execute({
          command: 'test command',
          context: {},
        })
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!({ content: 'Success' })
        await mockPromise
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should handle processCommand method', async () => {
      const mockResponse = { content: 'Processed' }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAICommand())

      let processResult: unknown
      await act(async () => {
        processResult = await result.current.processCommand('test command', { source: 'test' })
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-gateway/process', {
        command: 'test command',
        context: { source: 'test' },
      })
      expect(processResult).toEqual(mockResponse)
    })

    it('should handle generateResponse method', async () => {
      const mockResponse = { content: 'Generated response' }
      mockApiClient.post.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAICommand())

      let generateResult: unknown
      await act(async () => {
        generateResult = await result.current.generateResponse('test prompt', 'system prompt', 100)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/ai-gateway/generate', {
        prompt: 'test prompt',
        systemPrompt: 'system prompt',
        maxTokens: 100,
      })
      expect(generateResult).toEqual(mockResponse)
    })
  })

  describe('getCommandSuggestions', () => {
    it('should return filtered suggestions based on input', async () => {
      const suggestions = await getCommandSuggestions('task')

      expect(suggestions).toEqual([
        'Create a task to review quarterly reports',
        'Create project milestones for Q1',
      ])
    })

    it('should return fallback suggestions for unmatched input', async () => {
      const suggestions = await getCommandSuggestions('random input')

      expect(suggestions).toEqual([
        'random input with AI assistance',
        'random input for tomorrow',
        'random input and send notification',
      ])
    })

    it('should filter by category', async () => {
      const suggestions = await getCommandSuggestions('calendar')

      expect(suggestions).toEqual([
        'Schedule a meeting with the team for next week',
      ])
    })

    it('should limit results to 3 suggestions', async () => {
      const suggestions = await getCommandSuggestions('a') // Should match many

      expect(suggestions.length).toBeLessThanOrEqual(3)
    })
  })

  describe('formatAIResponse', () => {
    it('should format AI response correctly', () => {
      const response = {
        content: 'Test content',
        tokens: {
          input: 50,
          output: 100,
          total: 150
        },
        cost: 0.025,
        cached: false,
      }

      const formatted = formatAIResponse(response)

      expect(formatted).toEqual({
        content: 'Test content',
        tokens: {
          input: 50,
          output: 100,
          total: 150
        },
        cost: 0.025,
        cached: false,
        formattedCost: '$0.0250',
        efficiency: 'Generated',
      })
    })

    it('should show cached efficiency for cached responses', () => {
      const response = {
        content: 'Cached content',
        tokens: {
          input: 40,
          output: 60,
          total: 100
        },
        cost: 0,
        cached: true,
      }

      const formatted = formatAIResponse(response)

      expect(formatted.efficiency).toBe('Cached')
      expect(formatted.formattedCost).toBe('$0.0000')
    })
  })
})