'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Bot,
  X
} from 'lucide-react'
import { 
  useCalendarEvents,
  useTodayEvents,
  useUpcomingEvents,
  formatEventTime,
  getEventTypeColor,
  isEventSoon,
  isEventNow,
  CalendarEvent
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useResponsiveLayout } from '@/lib/hooks/useResponsiveLayout'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const layout = useResponsiveLayout()
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [eventFilter, setEventFilter] = useState<'all' | 'meetings' | 'personal'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // API hooks - called before any early returns
  const { events: allEvents, isLoading: eventsLoading, mutate: refreshEvents } = useCalendarEvents()
  const { events: todayEvents } = useTodayEvents()
  const { events: upcomingEvents } = useUpcomingEvents()

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Get current month info
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())
  
  // Calculate end date using lastDayOfMonth
  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()))

  // Generate calendar days
  const calendarDays = []
  const currentCalendarDate = new Date(startDate)
  for (let i = 0; i < 42; i++) {
    calendarDays.push(new Date(currentCalendarDate))
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1)
  }

  // Filter events
  const filteredEvents = allEvents?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = eventFilter === 'all' || 
      (eventFilter === 'meetings' && event.attendees && event.attendees.length > 1) ||
      (eventFilter === 'personal' && (!event.attendees || event.attendees.length <= 1))
    
    return matchesSearch && matchesFilter
  }) || []

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      
      // Ensure we don't navigate beyond reasonable bounds using lastDayOfMonth
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 2) // Allow 2 years in future
      
      if (direction === 'next' && newDate > maxDate) {
        return prev // Don't navigate too far into future
      }
      
      return newDate
    })
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleCreateEvent = () => {
    // Navigate to event creation page
    window.location.href = '/calendar/new'
  }

  const handleAIOptimize = async () => {
    if (session?.user?.id && refreshEvents) {
      try {
        // Trigger AI calendar optimization
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.user.id}`
          }
        })
        // Refresh events after optimization
        refreshEvents()
      } catch (error) {
        console.error('Failed to optimize calendar:', error)
      }
    }
  }

  const handleViewModeChange = (mode: 'month' | 'week' | 'day') => {
    setViewMode(mode)
  }

  const handleRefreshEvents = async () => {
    if (refreshEvents) {
      setIsRefreshing(true)
      try {
        await refreshEvents()
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (session?.user?.id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/calendar/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.id}`
          }
        })
        refreshEvents?.()
        setSelectedEvent(null)
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
  }

  const handleCopyEvent = (event: CalendarEvent) => {
    const eventText = `${event.title}\n${formatEventTime(event.startTime, event.endTime, event.isAllDay)}${event.location ? `\nLocation: ${event.location}` : ''}`
    navigator.clipboard.writeText(eventText)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    window.location.href = `/calendar/edit/${event.id}`
  }

  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent dark:from-blue-500/10 dark:via-blue-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent dark:from-purple-500/10 dark:via-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className={`relative ${isCommandCenterOpen ? '' : 'container mx-auto px-3 sm:px-4 lg:px-8'}`}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="liquid-glass-accent rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Calendar
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 leading-relaxed hidden sm:block">
                  Manage your schedule and let AI optimize your time.
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/25 dark:shadow-white/25 flex-shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-black" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="liquid-glass-accent border-0">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {todayEvents?.length || 0}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Events scheduled</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {upcomingEvents?.length || 0}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">This week</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                  Meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {allEvents?.filter(e => e.attendees && e.attendees.length > 1).length || 0}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">With others</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="calendar" className={layout.spacing}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              {/* Mobile action buttons */}
              <div className="flex flex-col sm:hidden gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full liquid-glass-subtle border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={toggleFilters} className="flex-1">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshEvents}
                    disabled={isRefreshing}
                    className="flex-1"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAIOptimize} 
                    className="w-10 h-10 p-0 rounded-full flex items-center justify-center"
                  >
                    <Bot className="w-5 h-5" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleCreateEvent} 
                    className="w-10 h-10 p-0 rounded-full flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Desktop action buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${isCommandCenterOpen ? 'w-32' : 'w-40 md:w-64'} liquid-glass-subtle border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200`}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleFilters}
                  className={isCommandCenterOpen ? "p-2" : ""}
                >
                  <Filter className={`w-4 h-4 ${isCommandCenterOpen ? '' : 'mr-1'}`} />
                  {!isCommandCenterOpen && <span>Filter</span>}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshEvents}
                  disabled={isRefreshing}
                  className={isCommandCenterOpen ? "p-2" : ""}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''} ${isCommandCenterOpen ? '' : 'mr-1'}`} />
                  {!isCommandCenterOpen && <span>Refresh</span>}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAIOptimize}
                  className={isCommandCenterOpen ? "p-2" : ""}
                >
                  <Bot className={`w-4 h-4 ${isCommandCenterOpen ? '' : 'mr-1'}`} />
                  {!isCommandCenterOpen && <span>AI Optimize</span>}
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateEvent}
                  className={isCommandCenterOpen ? "w-10 h-10 p-0 rounded-full" : ""}
                >
                  <Plus className={isCommandCenterOpen ? "w-5 h-5" : "w-4 h-4 mr-1"} />
                  {!isCommandCenterOpen && <span>New Event</span>}
                </Button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <Card className="liquid-glass-accent border-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant={eventFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('all')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          All
                        </Button>
                        <Button
                          variant={eventFilter === 'meetings' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('meetings')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Meetings
                        </Button>
                        <Button
                          variant={eventFilter === 'personal' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('personal')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Personal
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={viewMode === 'month' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('month')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Month
                        </Button>
                        <Button
                          variant={viewMode === 'week' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('week')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Week
                        </Button>
                        <Button
                          variant={viewMode === 'day' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('day')}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Day
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <TabsContent value="calendar" className="space-y-6">
              {/* Calendar Navigation */}
              <Card className="liquid-glass-accent border-0">
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">{currentMonth}</h2>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="px-2 sm:px-3">
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs sm:text-sm px-2 sm:px-3">
                        Today
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="px-2 sm:px-3">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                    {/* Day headers - Mobile abbreviations */}
                    {[
                      { full: 'Sun', short: 'S' },
                      { full: 'Mon', short: 'M' },
                      { full: 'Tue', short: 'T' },
                      { full: 'Wed', short: 'W' },
                      { full: 'Thu', short: 'T' },
                      { full: 'Fri', short: 'F' },
                      { full: 'Sat', short: 'S' }
                    ].map(day => (
                      <div key={day.full} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                        <span className="sm:hidden">{day.short}</span>
                        <span className="hidden sm:inline">{day.full}</span>
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {calendarDays.map((date, index) => {
                      const dayEvents = getEventsForDay(date)
                      const today = isToday(date)
                      const currentMonth = isCurrentMonth(date)
                      
                      return (
                        <button
                          key={index}
                          className={`
                            min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-0.5 sm:p-1 md:p-2 border border-gray-100 dark:border-gray-700 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left w-full
                            ${today ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : ''}
                            ${!currentMonth ? 'text-gray-400 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-800/50' : ''}
                          `}
                          onClick={() => {
                            setCurrentDate(new Date(date))
                            if (getEventsForDay(date).length > 0) {
                              setSelectedEvent(getEventsForDay(date)[0])
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setCurrentDate(new Date(date))
                              if (getEventsForDay(date).length > 0) {
                                setSelectedEvent(getEventsForDay(date)[0])
                              }
                            }
                          }}
                          aria-label={`View events for ${date.toLocaleDateString()}`}
                        >
                          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                            <span className={`text-xs sm:text-sm ${today ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {date.getDate()}
                            </span>
                            {today && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="space-y-0.5">
                            {/* Mobile: Show dots for events, Desktop: Show event titles */}
                            <div className="sm:hidden flex gap-0.5">
                              {dayEvents.slice(0, 4).map((event) => (
                                <button
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEventClick(event)
                                  }}
                                  className={`
                                    w-1.5 h-1.5 rounded-full
                                    ${isEventNow(event.startTime, event.endTime) 
                                      ? 'bg-green-500' 
                                      : isEventSoon(event.startTime)
                                      ? 'bg-yellow-500'
                                      : 'bg-blue-500'
                                    }
                                  `}
                                  title={event.title}
                                  aria-label={`View details for ${event.title}`}
                                />
                              ))}
                              {dayEvents.length > 4 && (
                                <span className="text-[8px] text-gray-500 dark:text-gray-400">+{dayEvents.length - 4}</span>
                              )}
                            </div>
                            
                            {/* Desktop: Show event titles */}
                            <div className="hidden sm:block space-y-0.5">
                              {dayEvents.slice(0, 3).map((event) => (
                                <button
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEventClick(event)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleEventClick(event)
                                    }
                                  }}
                                  className={`
                                    text-xs p-0.5 sm:p-1 rounded truncate cursor-pointer hover:scale-105 transition-transform w-full text-left
                                    ${isEventNow(event.startTime, event.endTime) 
                                      ? 'bg-green-200 text-green-800' 
                                      : isEventSoon(event.startTime)
                                      ? 'bg-yellow-200 text-yellow-800'
                                      : getEventTypeColor(event)
                                    }
                                  `}
                                  title={event.title}
                                  aria-label={`View details for ${event.title}`}
                                >
                                  {event.title}
                                </button>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agenda" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl text-gray-900 dark:text-gray-100">Upcoming Events</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Your schedule for the next 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {eventsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="animate-pulse">
                          <div className="flex space-x-3">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No events found</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {filteredEvents.slice(0, 10).map((event) => (
                        <button 
                          key={event.id} 
                          className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer w-full text-left" 
                          onClick={() => handleEventClick(event)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleEventClick(event)
                            }
                          }}
                          aria-label={`View details for ${event.title}`}
                        >
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                              isEventNow(event.startTime, event.endTime)
                                ? 'bg-green-100 text-green-600'
                                : isEventSoon(event.startTime)
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">{event.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{formatEventTime(event.startTime, event.endTime, event.isAllDay)}</span>
                                </p>
                                {event.location && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </p>
                                )}
                                {event.attendees && event.attendees.length > 0 && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <Users className="w-3 h-3 flex-shrink-0" />
                                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
                                {isEventNow(event.startTime, event.endTime) && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                    Live
                                  </Badge>
                                )}
                                {isEventSoon(event.startTime) && !isEventNow(event.startTime, event.endTime) && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                    Soon
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm" className="p-1 sm:p-2">
                                  <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Calendar Analytics</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Insights about your scheduling patterns and productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Bot className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      AI Analytics Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      We're building intelligent calendar analytics to help you optimize your time and improve productivity.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center sm:p-4 z-50">
          <Card className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-gray-100 pr-2">{selectedEvent.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="p-1 -mr-1">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4 overflow-y-auto max-h-[60vh] sm:max-h-[50vh]">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="break-words">{formatEventTime(selectedEvent.startTime, selectedEvent.endTime, selectedEvent.isAllDay)}</span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attendees:</p>
                  <div className="space-y-1">
                    {selectedEvent.attendees.slice(0, 5).map((attendee, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs text-gray-700 dark:text-gray-300">
                            {attendee.split('@')[0].slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {attendee}
                      </div>
                    ))}
                    {selectedEvent.attendees.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{selectedEvent.attendees.length - 5} more attendees
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditEvent(selectedEvent)}
                  className="w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCopyEvent(selectedEvent)}
                  className="w-full sm:w-auto"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}