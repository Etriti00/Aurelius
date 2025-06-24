'use client'

import React, { useState, useMemo } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Plus,
  MoreHorizontal
} from 'lucide-react'
import { CalendarEvent } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: (date: Date) => void
  onDeleteEvent?: (eventId: string) => void
  onEditEvent?: (event: CalendarEvent) => void
  className?: string
}

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: () => void
}

function getEventColor(event: CalendarEvent): string {
  // Color based on event type or location
  if (event.isAllDay) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (event.location?.includes('zoom') || event.location?.includes('meet')) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }
  if (event.provider === 'google') return 'bg-green-100 text-green-800 border-green-200'
  if (event.provider === 'outlook') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function DayView({ date, events, isCurrentMonth, isToday, onEventClick, onCreateEvent }: DayViewProps) {
  const dayEvents = events.filter(event => {
    const eventDate = parseISO(event.startTime)
    return isSameDay(eventDate, date)
  })

  return (
    <div
      className={cn(
        "min-h-[120px] p-2 border-r border-b transition-colors",
        !isCurrentMonth && "bg-gray-50/50",
        isToday && "bg-blue-50/50"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-sm font-medium",
          !isCurrentMonth && "text-muted-foreground",
          isToday && "text-blue-600"
        )}>
          {format(date, 'd')}
        </span>
        {isToday && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            Today
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventClick?.(event)}
            className={cn(
              "text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left",
              getEventColor(event)
            )}
          >
            {!event.isAllDay && (
              <span className="font-medium mr-1">
                {format(parseISO(event.startTime), 'HH:mm')}
              </span>
            )}
            {event.title}
          </button>
        ))}
        
        {dayEvents.length > 3 && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onEventClick?.(dayEvents[0])}
          >
            +{dayEvents.length - 3} more
          </button>
        )}
      </div>
      
      {isCurrentMonth && (
        <button
          onClick={onCreateEvent}
          className="w-full mt-1 opacity-0 hover:opacity-100 transition-opacity"
        >
          <Plus className="h-3 w-3 mx-auto text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

export function CalendarView({ 
  events, 
  onEventClick, 
  onCreateEvent,
  onDeleteEvent,
  onEditEvent,
  className 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigatePrevious = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const navigateNext = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="space-y-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigatePrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToday}
                className="px-3"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onCreateEvent?.(currentDate)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Event
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-1.5" />
                  {viewMode === 'month' ? 'Month' : viewMode === 'week' ? 'Week' : 'Day'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewMode('month')}>
                  Month View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('week')}>
                  Week View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('day')}>
                  Day View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border-t">
          {viewMode === 'month' && (
            <>
              {/* Week day headers */}
              <div className="grid grid-cols-7 border-b">
                {weekDays.map(day => (
                  <div
                    key={day}
                    className="py-2 px-2 text-sm font-medium text-center text-muted-foreground border-r last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => (
                  <DayView
                    key={day.toISOString()}
                    date={day}
                    events={events}
                    isCurrentMonth={isSameMonth(day, currentDate)}
                    isToday={isToday(day)}
                    onEventClick={onEventClick}
                    onCreateEvent={() => onCreateEvent?.(day)}
                  />
                ))}
              </div>
            </>
          )}
          
          {viewMode === 'week' && (
            <div className="p-4">
              <p className="text-center text-muted-foreground">Week view coming soon</p>
            </div>
          )}
          
          {viewMode === 'day' && (
            <div className="p-4">
              <p className="text-center text-muted-foreground">Day view coming soon</p>
            </div>
          )}
        </div>
        
        {/* Upcoming events sidebar */}
        <div className="border-t p-4">
          <h3 className="font-medium text-sm mb-3">Upcoming Events</h3>
          <div className="space-y-2">
            {events
              .filter(event => parseISO(event.startTime) >= new Date())
              .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
              .slice(0, 5)
              .map(event => (
                <button
                  key={event.id}
                  type="button"
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    getEventColor(event).replace('text-', 'bg-').replace('-800', '-500')
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(event.startTime), 'MMM d, HH:mm')}
                      </span>
                      {event.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {event.location.includes('zoom') || event.location.includes('meet') ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditEvent?.(event)}>
                        Edit Event
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onDeleteEvent?.(event.id)}
                      >
                        Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CalendarView