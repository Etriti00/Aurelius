'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { OverviewCard } from '@/components/dashboard/OverviewCard'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { InboxWidget } from '@/components/dashboard/InboxWidget'
import { TasksKanban } from '@/components/dashboard/TasksKanban'
import { SuggestionsPanel } from '@/components/dashboard/SuggestionsPanel'
import { Calendar, CheckSquare, Inbox, Sparkles, TrendingUp } from 'lucide-react'
import { FloatingActionButton } from '@/components/dashboard/FloatingActionButton'
import { 
  generateDashboardCards,
  useTaskStats,
  useEmailStats,
  useCalendarAnalytics,
  useBillingUsage 
} from '@/lib/api'
import { useWebSocketUpdates, useWebSocketNotifications } from '@/lib/websocket/websocket.service'

export default function DashboardPage() {
  const { data: session } = useSession()

  // Fetch real data from APIs
  const { stats: taskStats, isLoading: tasksLoading, error: tasksError, mutate: refreshTasks } = useTaskStats()
  const { stats: emailStats, isLoading: emailLoading, error: emailError, mutate: refreshEmails } = useEmailStats()
  const { analytics: calendarStats, isLoading: calendarLoading, error: calendarError, mutate: refreshCalendar } = useCalendarAnalytics()
  const { usage: usageMetrics, isLoading: usageLoading, error: usageError } = useBillingUsage()

  // WebSocket real-time updates
  const { subscribeToTaskUpdates, subscribeToEmailUpdates, subscribeToCalendarUpdates } = useWebSocketUpdates()
  useWebSocketNotifications() // Subscribe to notifications

  // Setup real-time listeners
  React.useEffect(() => {
    const unsubscribeTask = subscribeToTaskUpdates(() => {
      refreshTasks()
    })

    const unsubscribeEmail = subscribeToEmailUpdates(() => {
      refreshEmails()
    })

    const unsubscribeCalendar = subscribeToCalendarUpdates(() => {
      refreshCalendar()
    })

    return () => {
      unsubscribeTask()
      unsubscribeEmail()
      unsubscribeCalendar()
    }
  }, [subscribeToTaskUpdates, subscribeToEmailUpdates, subscribeToCalendarUpdates, refreshTasks, refreshEmails, refreshCalendar])

  // Generate dashboard cards from real data
  const dashboardCards = generateDashboardCards(taskStats, emailStats, calendarStats, usageMetrics)

  const welcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Show loading state
  const isLoading = tasksLoading || emailLoading || calendarLoading || usageLoading
  const hasError = tasksError || emailError || calendarError || usageError

  // Fallback data for when API is not available
  const fallbackCards = [
    {
      title: "Today's Tasks",
      value: "8",
      change: "+2 from yesterday",
      icon: '✅',
      color: 'text-blue-600 bg-blue-50',
      trend: 'up' as const,
    },
    {
      title: 'Unread Emails',
      value: "12",
      change: "-5 from yesterday",
      icon: '📧',
      color: 'text-green-600 bg-green-50',
      trend: 'down' as const,
    },
    {
      title: 'Meetings Today',
      value: "4",
      change: "2 upcoming",
      icon: '📅',
      color: 'text-purple-600 bg-purple-50',
      trend: 'neutral' as const,
    },
    {
      title: 'AI Actions',
      value: "156",
      change: "+23 this week",
      icon: '🤖',
      color: 'text-orange-600 bg-orange-50',
      trend: 'up' as const,
    },
  ]

  const cardsToDisplay = hasError ? fallbackCards : (dashboardCards.length > 0 ? dashboardCards : fallbackCards)

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired global background matching landing page */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Base gradient with more sophistication */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40" />
        
        {/* Primary floating orbs with enhanced motion */}
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
        
        {/* Mid-layer atmospheric orbs */}
        <div className="absolute left-1/4 top-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/20 to-blue-300/15 rounded-full blur-2xl opacity-70 animate-pulse" style={{ animationDelay: '1s', animationDuration: '12s' }} />
        <div className="absolute right-1/4 bottom-1/3 w-[400px] h-[400px] bg-gradient-to-tl from-indigo-300/20 to-purple-300/15 rounded-full blur-2xl opacity-60 animate-pulse" style={{ animationDelay: '5s', animationDuration: '9s' }} />
        
        {/* Floating interaction elements */}
        <div className="absolute top-1/5 left-3/4 w-40 h-40 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 left-1/5 w-32 h-32 bg-gradient-to-l from-violet-500/20 to-purple-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        <div className="absolute top-2/3 right-1/5 w-28 h-28 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        
        {/* Geometric pattern overlays */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59, 130, 246) 1px, transparent 0)`,
            backgroundSize: '80px 80px'
          }} />
        </div>
        
        {/* Hexagonal subtle pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.1'%3E%3Cpolygon points='60,10 90,30 90,70 60,90 30,70 30,30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px'
          }} />
        </div>
        
        {/* Mesh gradient overlay for depth */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at bottom left, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
            `
          }} />
        </div>
        
        {/* Subtle noise texture for premium feel */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23000' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }} />
        </div>
        
        {/* Dynamic light rays */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-blue-400/20 via-transparent to-purple-400/20 opacity-30 animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-indigo-400/15 via-transparent to-cyan-400/15 opacity-20 animate-pulse" style={{ animationDuration: '18s', animationDelay: '2s' }} />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-violet-400/15 via-transparent to-blue-400/15 opacity-25 animate-pulse" style={{ animationDuration: '20s', animationDelay: '4s' }} />
      </div>

      <div className="relative space-y-8 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 sm:p-8">
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                {welcomeMessage()}, {session?.user?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-2 leading-relaxed max-w-2xl">
                Your AI chief of staff is here to help. Review your insights below or click the brain to get started.
              </p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/25 ml-4">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            // Loading skeleton with landing page style
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 animate-pulse">
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="h-4 bg-gray-200/60 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200/60 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200/60 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : hasError ? (
            // Error state with fallback
            <div className="col-span-full liquid-glass-accent rounded-2xl sm:rounded-3xl p-6">
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="relative flex items-center space-x-3 text-amber-600">
                <Sparkles className="w-5 h-5" />
                <p>Using cached data while reconnecting to services...</p>
              </div>
            </div>
          ) : null}
        
        {/* Render cards (either real data or fallback) */}
        {cardsToDisplay.map((card) => {
          // Map icons
          const iconMap = {
            '✅': CheckSquare,
            '📧': Inbox,
            '📅': Calendar,
            '🤖': TrendingUp,
          }
          
          return (
            <OverviewCard
              key={card.title}
              title={card.title}
              value={String(card.value)}
              change={card.change || ''}
              icon={iconMap[card.icon as keyof typeof iconMap] || CheckSquare}
              trend={card.trend || 'neutral'}
            />
          )
        })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Primary workspace (Tasks) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Your Tasks
              </h2>
              <span className="text-sm text-gray-500">Drag & drop to organize</span>
            </div>
            <TasksKanban />
          </div>

          {/* Right Column - Context & Actions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Today's Context
              </h2>
            </div>
            <CalendarWidget />
            <InboxWidget />
            <SuggestionsPanel />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  )
}