'use client'

import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Plus, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  useTodayEvents, 
  formatEventTime, 
  getEventTypeColor, 
  isEventSoon, 
  isEventNow,
  CalendarEvent 
} from '@/lib/api'

// Mock data for fallback when API is not available
const mockTodayEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Weekly Team Sync',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: 'Conference Room A',
    attendees: ['john@example.com', 'jane@example.com', 'bob@example.com'],
    isAllDay: false,
    recurring: false,
    provider: 'google',
    eventId: 'mock-1',
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Client Presentation',
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    location: 'Virtual - Zoom',
    attendees: ['client@company.com', 'sales@company.com'],
    isAllDay: false,
    recurring: false,
    provider: 'google',
    eventId: 'mock-2',
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Project Review',
    startTime: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7.5 * 60 * 60 * 1000).toISOString(),
    location: 'Conference Room B',
    attendees: ['dev1@company.com', 'dev2@company.com', 'pm@company.com'],
    isAllDay: false,
    recurring: false,
    provider: 'google',
    eventId: 'mock-3',
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
]

export function CalendarWidget() {
  // Fetch real events from API
  const { events: apiEvents, isLoading, error } = useTodayEvents()
  
  // Use real data if available, otherwise fallback to mock data
  const events = error || !apiEvents ? mockTodayEvents : apiEvents

  return (
    <div className="relative liquid-glass-accent rounded-2xl sm:rounded-3xl p-6">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-black/25">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              Today&apos;s Schedule
            </h3>
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
          </div>
          <button className="p-2 bg-black text-white rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] transition-all duration-200">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No events scheduled for today</p>
          </div>
        ) : (
          events.map((event, index) => {
            const eventSoon = isEventSoon(event.startTime)
            const eventNow = isEventNow(event.startTime, event.endTime)
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative liquid-glass-accent rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${
                  eventNow 
                    ? 'border border-green-300 bg-green-50/30' 
                    : eventSoon 
                    ? 'border border-amber-300 bg-amber-50/30' 
                    : ''
                }`}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="relative space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {event.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {eventNow && (
                        <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                          Live
                        </Badge>
                      )}
                      {eventSoon && !eventNow && (
                        <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                          Soon
                        </Badge>
                      )}
                      <Badge className={`text-xs ${getEventTypeColor(event)}`}>
                        {event.isAllDay ? 'All Day' : 'Meeting'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatEventTime(event.startTime, event.endTime, event.isAllDay)}
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.location}
                      </div>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        
        <button className="w-full px-4 py-2 bg-black text-white text-sm font-semibold rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] transition-all duration-200">
          View Full Calendar
        </button>
        </div>
      </div>
    </div>
  )
}