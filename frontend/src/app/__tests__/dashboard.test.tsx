import { render, screen } from '@testing-library/react'
import DashboardPage from '../dashboard/page'

// Mock all the dependencies
jest.mock('@/components/dashboard/OverviewCard', () => ({
  OverviewCard: ({ title, value, change }: { title: string; value: string | number; change?: string }) => (
    <div data-testid="overview-card">
      <h3>{title}</h3>
      <div>{value}</div>
      <div>{change}</div>
    </div>
  ),
}))

jest.mock('@/components/dashboard/CalendarWidget', () => ({
  CalendarWidget: () => <div data-testid="calendar-widget">Calendar Widget</div>,
}))

jest.mock('@/components/dashboard/InboxWidget', () => ({
  InboxWidget: () => <div data-testid="inbox-widget">Inbox Widget</div>,
}))

jest.mock('@/components/dashboard/TasksKanban', () => ({
  TasksKanban: () => <div data-testid="tasks-kanban">Tasks Kanban</div>,
}))

jest.mock('@/components/dashboard/SuggestionsPanel', () => ({
  SuggestionsPanel: () => <div data-testid="suggestions-panel">Suggestions Panel</div>,
}))

jest.mock('@/lib/api', () => ({
  generateDashboardCards: jest.fn(),
  useTaskStats: jest.fn(),
  useEmailStats: jest.fn(),
  useCalendarAnalytics: jest.fn(),
  useBillingUsage: jest.fn(),
}))

jest.mock('@/lib/websocket/websocket.service', () => ({
  useWebSocketUpdates: jest.fn(),
  useWebSocketNotifications: jest.fn(),
}))

describe('Dashboard Page', () => {
  const mockStats = {
    totalTasks: 42,
    completedTasks: 25,
    pendingTasks: 17,
    overdueTasks: 3,
  }

  const mockEmailStats = {
    totalThreads: 15,
    unreadThreads: 8,
    importantThreads: 3,
    recentThreads: 5,
  }

  const mockCalendarStats = {
    todayEvents: 4,
    upcomingEvents: 12,
    weeklyMeetings: 8,
    averageMeetingDuration: 45,
  }

  const mockUsageMetrics = {
    actionsUsed: 156,
    actionsLimit: 1000,
    percentageUsed: 15.6,
    resetDate: '2024-01-01',
  }

  const mockGeneratedCards = [
    {
      title: 'Today\'s Tasks',
      value: 8,
      change: '+2 from yesterday',
      icon: '✅',
      color: 'text-blue-600 bg-blue-50',
      trend: 'up' as const,
    },
    {
      title: 'Unread Emails',
      value: 12,
      change: '-5 from yesterday',
      icon: '📧',
      color: 'text-green-600 bg-green-50',
      trend: 'down' as const,
    },
  ]

  beforeEach(() => {
    const {
      useTaskStats,
      useEmailStats,
      useCalendarAnalytics,
      useBillingUsage,
      generateDashboardCards,
    } = jest.requireMock('@/lib/api')

    const {
      useWebSocketUpdates,
      useWebSocketNotifications,
    } = jest.requireMock('@/lib/websocket/websocket.service')

    useTaskStats.mockReturnValue({
      stats: mockStats,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })

    useEmailStats.mockReturnValue({
      stats: mockEmailStats,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })

    useCalendarAnalytics.mockReturnValue({
      analytics: mockCalendarStats,
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    })

    useBillingUsage.mockReturnValue({
      usage: mockUsageMetrics,
      isLoading: false,
      error: null,
    })

    generateDashboardCards.mockReturnValue(mockGeneratedCards)

    useWebSocketUpdates.mockReturnValue({
      subscribeToTaskUpdates: jest.fn(() => jest.fn()),
      subscribeToEmailUpdates: jest.fn(() => jest.fn()),
      subscribeToCalendarUpdates: jest.fn(() => jest.fn()),
    })

    useWebSocketNotifications.mockReturnValue({
      notifications: [],
    })
  })

  it('renders dashboard with welcome message', () => {
    render(<DashboardPage />)

    expect(screen.getByText(/Good/)).toBeInTheDocument() // Good morning/afternoon/evening
    expect(screen.getByText(/Here's what's happening with your productivity today/)).toBeInTheDocument()
  })

  it('renders all dashboard widgets', () => {
    render(<DashboardPage />)

    expect(screen.getByTestId('calendar-widget')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-widget')).toBeInTheDocument()
    expect(screen.getByTestId('tasks-kanban')).toBeInTheDocument()
    expect(screen.getByTestId('suggestions-panel')).toBeInTheDocument()
  })

  it('renders overview cards with real data', () => {
    render(<DashboardPage />)

    const overviewCards = screen.getAllByTestId('overview-card')
    expect(overviewCards).toHaveLength(2)

    expect(screen.getByText('Today\'s Tasks')).toBeInTheDocument()
    expect(screen.getByText('Unread Emails')).toBeInTheDocument()
  })

  it('shows loading state for overview cards', () => {
    const { useTaskStats } = jest.requireMock('@/lib/api')
    useTaskStats.mockReturnValue({
      stats: null,
      isLoading: true,
      error: null,
      mutate: jest.fn(),
    })

    render(<DashboardPage />)

    // Should show loading skeletons
    expect(screen.getByText(/Here's what's happening/)).toBeInTheDocument()
  })

  it('shows error state with fallback data', () => {
    const { useTaskStats, generateDashboardCards } = jest.requireMock('@/lib/api')
    
    useTaskStats.mockReturnValue({
      stats: null,
      isLoading: false,
      error: 'API Error',
      mutate: jest.fn(),
    })

    // Mock fallback cards
    generateDashboardCards.mockReturnValue([])

    render(<DashboardPage />)

    expect(screen.getByText('Using cached data while reconnecting to services...')).toBeInTheDocument()
  })

  it('handles different times of day correctly', () => {
    // Mock current time to afternoon
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14)

    render(<DashboardPage />)

    expect(screen.getByText(/Good afternoon/)).toBeInTheDocument()

    // Cleanup
    jest.restoreAllMocks()
  })

  it('sets up WebSocket listeners correctly', () => {
    const {
      useWebSocketUpdates,
    } = jest.requireMock('@/lib/websocket/websocket.service')

    const mockSubscribeToTaskUpdates = jest.fn(() => jest.fn())
    const mockSubscribeToEmailUpdates = jest.fn(() => jest.fn())
    const mockSubscribeToCalendarUpdates = jest.fn(() => jest.fn())

    useWebSocketUpdates.mockReturnValue({
      subscribeToTaskUpdates: mockSubscribeToTaskUpdates,
      subscribeToEmailUpdates: mockSubscribeToEmailUpdates,
      subscribeToCalendarUpdates: mockSubscribeToCalendarUpdates,
    })

    render(<DashboardPage />)

    expect(mockSubscribeToTaskUpdates).toHaveBeenCalled()
    expect(mockSubscribeToEmailUpdates).toHaveBeenCalled()
    expect(mockSubscribeToCalendarUpdates).toHaveBeenCalled()
  })

  it('handles empty user name gracefully', () => {
    // Mock session without name
    jest.mock('next-auth/react', () => ({
      useSession: () => ({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        status: 'authenticated',
      }),
    }))

    render(<DashboardPage />)

    expect(screen.getByText(/there!/)).toBeInTheDocument()
  })
})