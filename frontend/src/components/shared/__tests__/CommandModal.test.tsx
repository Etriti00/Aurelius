import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandModal } from '../CommandModal'

// Mock the API hooks
jest.mock('@/lib/api', () => ({
  useAICommand: jest.fn(),
  getCommandSuggestions: jest.fn(),
}))

describe('CommandModal', () => {
  const mockExecute = jest.fn()
  const mockUseAICommand = jest.requireMock('@/lib/api').useAICommand
  const mockGetSuggestions = jest.requireMock('@/lib/api').getCommandSuggestions

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAICommand.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: null,
    })
    mockGetSuggestions.mockResolvedValue([
      'Create a task for project review',
      'Schedule meeting with team',
      'Draft email response',
    ])
  })

  it('renders modal when open', () => {
    render(<CommandModal {...defaultProps} />)
    
    expect(screen.getByText('AI Command Center')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/What would you like me to do/)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CommandModal {...defaultProps} open={false} />)
    
    expect(screen.queryByText('AI Command Center')).not.toBeInTheDocument()
  })

  it('shows quick actions when input is empty', () => {
    render(<CommandModal {...defaultProps} />)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Schedule meeting')).toBeInTheDocument()
    expect(screen.getByText('Draft email')).toBeInTheDocument()
    expect(screen.getByText('Create task')).toBeInTheDocument()
  })

  it('shows recent commands when input is empty', () => {
    render(<CommandModal {...defaultProps} />)
    
    expect(screen.getByText('Recent Commands')).toBeInTheDocument()
    expect(screen.getByText('Schedule meeting with John next week')).toBeInTheDocument()
  })

  it('handles input change and shows suggestions', async () => {
    const user = userEvent.setup()
    render(<CommandModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    await user.type(input, 'create task')
    
    await waitFor(() => {
      expect(mockGetSuggestions).toHaveBeenCalledWith('create task')
    })
  })

  it('handles command submission', async () => {
    const user = userEvent.setup()
    mockExecute.mockResolvedValue({
      content: 'Task created successfully',
      tokens: 100,
      cost: 0.01,
      cached: false,
    })

    render(<CommandModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    await user.type(input, 'create a new task')
    
    const submitButton = screen.getByRole('button', { name: /send/i })
    await user.click(submitButton)
    
    expect(mockExecute).toHaveBeenCalledWith({
      command: 'create a new task',
      context: { source: 'dashboard' },
    })
  })

  it('shows loading state during command execution', async () => {
    mockUseAICommand.mockReturnValue({
      execute: mockExecute,
      isLoading: true,
      error: null,
    })

    render(<CommandModal {...defaultProps} />)
    
    expect(screen.getByText('Processing your request...')).toBeInTheDocument()
    expect(screen.getByText('Aurelius is analyzing and executing your command')).toBeInTheDocument()
  })

  it('shows success state after command execution', async () => {
    const user = userEvent.setup()
    let resolveExecute: (value: unknown) => void
    const executePromise = new Promise((resolve) => {
      resolveExecute = resolve
    })
    
    mockExecute.mockReturnValue(executePromise)

    const { rerender } = render(<CommandModal {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    await user.type(input, 'test command')
    
    const submitButton = screen.getByRole('button', { name: /send/i })
    await user.click(submitButton)

    // Simulate command completion
    resolveExecute!({
      content: 'Command executed successfully',
      tokens: 100,
      cost: 0.01,
      cached: false,
    })

    // Rerender with updated state
    mockUseAICommand.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: null,
    })
    
    rerender(<CommandModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Command executed successfully')).toBeInTheDocument()
    })
  })

  it('shows error state when command fails', () => {
    mockUseAICommand.mockReturnValue({
      execute: mockExecute,
      isLoading: false,
      error: 'Command failed to execute',
    })

    render(<CommandModal {...defaultProps} />)
    
    expect(screen.getByText('Command failed')).toBeInTheDocument()
    expect(screen.getByText('Command failed to execute')).toBeInTheDocument()
  })

  it('disables submit button when input is empty', () => {
    render(<CommandModal {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /send/i })
    expect(submitButton).toBeDisabled()
  })

  it('handles quick action clicks', async () => {
    const user = userEvent.setup()
    render(<CommandModal {...defaultProps} />)
    
    const scheduleButton = screen.getByText('Schedule meeting')
    await user.click(scheduleButton)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    expect(input).toHaveValue('Schedule meeting: ')
  })

  it('handles recent command clicks', async () => {
    const user = userEvent.setup()
    render(<CommandModal {...defaultProps} />)
    
    const recentCommand = screen.getByText('Schedule meeting with John next week')
    await user.click(recentCommand)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    expect(input).toHaveValue('Schedule meeting with John next week')
  })

  it('resets state when modal opens', () => {
    const { rerender } = render(<CommandModal {...defaultProps} open={false} />)
    
    rerender(<CommandModal {...defaultProps} open={true} />)
    
    const input = screen.getByPlaceholderText(/What would you like me to do/)
    expect(input).toHaveValue('')
  })
})