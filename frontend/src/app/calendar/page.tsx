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
  Bot
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

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const layout = useResponsiveLayout()
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

      <div className={`relative container mx-auto ${layout.containerPadding}`}>
        <div className={layout.spacing}>
          {/* Header */}
          <div className={`liquid-glass-accent rounded-2xl sm:rounded-3xl ${layout.cardPadding}`}>
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <h1 className={`${layout.textSizes.h1} font-bold text-gray-900 dark:text-gray-100 tracking-tight`}>
                  Calendar
                </h1>
                <p className={`${layout.textSizes.body} text-gray-600 dark:text-gray-300 mt-2 leading-relaxed max-w-2xl`}>
                  Manage your schedule and let AI optimize your time.
                </p>
              </div>
              <div className={`${layout.isCompressed ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-16 sm:h-16'} bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/25 dark:shadow-white/25 ml-4`}>
                <CalendarIcon className={`${layout.isCompressed ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-6 h-6 sm:w-8 sm:h-8'} text-white dark:text-black`} />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={`grid ${layout.gridCols.cards} ${layout.gridGap}`}>
            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className={`${layout.textSizes.h3} flex items-center gap-2 text-gray-900 dark:text-gray-100`}>
                  <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${layout.isCompressed ? 'text-xl' : 'text-2xl'} font-bold text-blue-600 dark:text-blue-400 mb-1`}>
                  {todayEvents?.length || 0}
                </div>
                <p className={`${layout.textSizes.small} text-gray-600 dark:text-gray-400`}>Events scheduled</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className={`${layout.textSizes.h3} flex items-center gap-2 text-gray-900 dark:text-gray-100`}>
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${layout.isCompressed ? 'text-xl' : 'text-2xl'} font-bold text-green-600 dark:text-green-400 mb-1`}>
                  {upcomingEvents?.length || 0}
                </div>
                <p className={`${layout.textSizes.small} text-gray-600 dark:text-gray-400`}>This week</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className={`${layout.textSizes.h3} flex items-center gap-2 text-gray-900 dark:text-gray-100`}>
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${layout.isCompressed ? 'text-xl' : 'text-2xl'} font-bold text-purple-600 dark:text-purple-400 mb-1`}>
                  {allEvents?.filter(e => e.attendees && e.attendees.length > 1).length || 0}
                </div>
                <p className={`${layout.textSizes.small} text-gray-600 dark:text-gray-400`}>With others</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="calendar" className={layout.spacing}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <div className={`flex items-center ${layout.isCompressed ? 'gap-1' : 'gap-2'}`}>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${layout.isCompressed ? 'w-40' : 'w-64'} liquid-glass-subtle border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200`}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={toggleFilters}>
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshEvents}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleAIOptimize}>
                  <Bot className="w-4 h-4 mr-1" />
                  AI Optimize
                </Button>
                <Button size="sm" onClick={handleCreateEvent}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Event
                </Button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <Card className="liquid-glass-accent border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={eventFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('all')}
                        >
                          All Events
                        </Button>
                        <Button
                          variant={eventFilter === 'meetings' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('meetings')}
                        >
                          Meetings
                        </Button>
                        <Button
                          variant={eventFilter === 'personal' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEventFilter('personal')}
                        >
                          Personal
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={viewMode === 'month' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('month')}
                        >
                          Month
                        </Button>
                        <Button
                          variant={viewMode === 'week' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('week')}
                        >
                          Week
                        </Button>
                        <Button
                          variant={viewMode === 'day' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleViewModeChange('day')}
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
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className={`${layout.textSizes.h2} font-semibold text-gray-900 dark:text-gray-100`}>{currentMonth}</h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                        Today
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className={`grid grid-cols-7 ${layout.isCompressed ? 'gap-0.5' : 'gap-1'}`}>
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className={`${layout.isCompressed ? 'p-1' : 'p-2'} text-center ${layout.textSizes.small} font-medium text-gray-500 dark:text-gray-400`}>
                        {day}
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
                            ${layout.isCompressed ? 'min-h-[80px] p-1' : 'min-h-[100px] p-2'} border border-gray-100 dark:border-gray-700 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left w-full
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
                          <div className="flex items-center justify-between mb-1">
                            <span className={`${layout.textSizes.small} ${today ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {date.getDate()}
                            </span>
                            {today && (
                              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                            )}
                          </div>
                          
                          <div className={layout.isCompressed ? 'space-y-0.5' : 'space-y-1'}>
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
                                  text-xs ${layout.isCompressed ? 'p-0.5' : 'p-1'} rounded truncate cursor-pointer hover:scale-105 transition-transform w-full text-left
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
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agenda" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle className={`${layout.textSizes.h2} text-gray-900 dark:text-gray-100`}>Upcoming Events</CardTitle>
                  <CardDescription className={`${layout.textSizes.body} text-gray-600 dark:text-gray-400`}>
                    Your schedule for the next 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                    <div className={layout.spacing}>
                      {filteredEvents.slice(0, 10).map((event) => (
                        <button 
                          key={event.id} 
                          className={`flex items-start ${layout.isCompressed ? 'space-x-2 p-2' : 'space-x-4 p-4'} border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer w-full text-left`} 
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
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              isEventNow(event.startTime, event.endTime)
                                ? 'bg-green-100 text-green-600'
                                : isEventSoon(event.startTime)
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {formatEventTime(event.startTime, event.endTime, event.isAllDay)}
                                </p>
                                {event.location && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </p>
                                )}
                                {event.attendees && event.attendees.length > 0 && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <Users className="w-3 h-3" />
                                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isEventNow(event.startTime, event.endTime) && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Live
                                  </Badge>
                                )}
                                {isEventSoon(event.startTime) && !isEventNow(event.startTime, event.endTime) && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    Soon
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
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

      {/* Event Detail Modal would go here */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-gray-100">{selectedEvent.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                {formatEventTime(selectedEvent.startTime, selectedEvent.endTime, selectedEvent.isAllDay)}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {selectedEvent.location}
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
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditEvent(selectedEvent)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCopyEvent(selectedEvent)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700"
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