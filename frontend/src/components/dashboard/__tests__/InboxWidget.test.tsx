import { render, screen, fireEvent } from '@testing-library/react'
import { InboxWidget } from '../InboxWidget'

// Mock the API hooks
jest.mock('@/lib/api', () => ({
  useRecentThreads: jest.fn(),
  useEmailMutations: jest.fn(),
  getEmailPreview: jest.fn((body) => body.substring(0, 80)),
  getEmailSender: jest.fn((message) => message.sender),
  getEmailImportance: jest.fn(() => 'normal'),
  formatEmailDate: jest.fn(() => '2 hours ago'),
  isThreadUnread: jest.fn(() => true),
}))

// Mock WebSocket indicator
jest.mock('@/components/shared/WebSocketIndicator', () => ({
  WebSocketIndicator: () => <div data-testid="websocket-indicator">Connected</div>
}))

const mockEmailThreads = [
  {
    id: '1',
    subject: 'Test Email Subject',
    participants: ['test@example.com'],
    lastActivity: '2023-12-01T10:00:00Z',
    messageCount: 1,
    isUnread: true,
    messages: [
      {
        id: 'msg1',
        threadId: '1',
        messageId: 'msg1',
        sender: 'Test Sender <test@example.com>',
        recipients: ['me@example.com'],
        subject: 'Test Email Subject',
        body: 'This is a test email body content that should be displayed in the widget.',
        isRead: false,
        sentAt: '2023-12-01T10:00:00Z',
        attachments: [],
        userId: 'user1',
        createdAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
      }
    ],
    userId: 'user1',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-01T10:00:00Z',
  }
]

describe('InboxWidget', () => {
  const mockMarkAsRead = jest.fn()
  const mockUseRecentThreads = jest.requireMock('@/lib/api').useRecentThreads
  const mockUseEmailMutations = jest.requireMock('@/lib/api').useEmailMutations

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRecentThreads.mockReturnValue({
      threads: mockEmailThreads,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })
    mockUseEmailMutations.mockReturnValue({
      markAsRead: mockMarkAsRead,
    })
  })

  it('renders email threads correctly', () => {
    render(<InboxWidget />)
    
    expect(screen.getByText('Recent Emails')).toBeInTheDocument()
    expect(screen.getByText('Test Email Subject')).toBeInTheDocument()
    expect(screen.getByText('Test Sender')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseRecentThreads.mockReturnValue({
      threads: [],
      isLoading: true,
      error: null,
      mutate: jest.fn(),
    })

    render(<InboxWidget />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows empty state when no emails', () => {
    mockUseRecentThreads.mockReturnValue({
      threads: [],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })

    render(<InboxWidget />)
    
    expect(screen.getByText('No recent emails')).toBeInTheDocument()
  })

  it('shows error state with fallback data', () => {
    mockUseRecentThreads.mockReturnValue({
      threads: [],
      isLoading: false,
      error: 'API Error',
      mutate: jest.fn(),
    })

    render(<InboxWidget />)
    
    expect(screen.getByText('API temporarily unavailable - showing cached data')).toBeInTheDocument()
  })

  it('handles click to mark as read', () => {
    render(<InboxWidget />)
    
    const emailThread = screen.getByText('Test Email Subject').closest('div[class*="border"]')
    expect(emailThread).toBeInTheDocument()
    
    if (emailThread) {
      fireEvent.click(emailThread)
      expect(mockMarkAsRead).toHaveBeenCalledWith('1')
    }
  })

  it('displays unread indicator for unread emails', () => {
    render(<InboxWidget />)
    
    const emailThread = screen.getByText('Test Email Subject').closest('div[class*="border"]')
    expect(emailThread).toHaveClass('border-blue-200')
    expect(emailThread).toHaveClass('bg-blue-50/50')
  })

  it('renders WebSocket indicator', () => {
    render(<InboxWidget />)
    
    expect(screen.getByTestId('websocket-indicator')).toBeInTheDocument()
  })

  it('handles email without messages gracefully', () => {
    const threadWithoutMessages = {
      ...mockEmailThreads[0],
      messages: [],
    }
    
    mockUseRecentThreads.mockReturnValue({
      threads: [threadWithoutMessages],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })

    render(<InboxWidget />)
    
    expect(screen.getByText('Test Email Subject')).toBeInTheDocument()
    expect(screen.getByText('No message content')).toBeInTheDocument()
  })
})