'use client'

import { Badge } from '@/components/ui/badge'
import { Sparkles, Calendar, Mail, CheckSquare, ArrowRight, X, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  useAISuggestions, 
  getSuggestionColor,
  AISuggestion 
} from '@/lib/api'

// Mock data for fallback when API is not available
const mockAISuggestions: AISuggestion[] = [
  {
    id: '1',
    type: 'email',
    title: 'Draft Reply to Sarah',
    description: 'Based on her urgent email about the project update, I can draft a comprehensive response.',
    action: 'Draft Reply',
    priority: 'high',
    confidence: 0.85,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'calendar',
    title: 'Schedule Team Meeting',
    description: 'John requested a meeting reschedule. I found 3 time slots that work for everyone.',
    action: 'Schedule',
    priority: 'medium',
    confidence: 0.78,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'task',
    title: 'Prepare Budget Analysis',
    description: 'Create a summary of Q4 budget changes before tomorrow\'s finance meeting.',
    action: 'Create Task',
    priority: 'high',
    confidence: 0.92,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'insight',
    title: 'Productivity Insight',
    description: 'You\'ve completed 23% more tasks this week. Consider scheduling a break to maintain momentum.',
    action: 'View Details',
    priority: 'low',
    confidence: 0.95,
    createdAt: new Date().toISOString(),
  }
]

export function SuggestionsPanel() {
  // Fetch real AI suggestions from API
  const { suggestions: apiSuggestions, isLoading, error, refresh } = useAISuggestions()
  
  // Use real data if available, otherwise fallback to mock data
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])
  const allSuggestions = error || !apiSuggestions ? mockAISuggestions : apiSuggestions
  const suggestions = allSuggestions.filter(s => !dismissedSuggestions.includes(s.id))

  const getTypeIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'calendar':
        return <Calendar className="w-4 h-4" />
      case 'task':
        return <CheckSquare className="w-4 h-4" />
      case 'insight':
        return <Sparkles className="w-4 h-4" />
    }
  }

  const handleDismiss = (id: string) => {
    setDismissedSuggestions(prev => [...prev, id])
  }

  const handleExecute = (suggestion: AISuggestion) => {
    // Here you would integrate with your AI service to execute the suggestion
    // For now, dismiss the suggestion after "execution"
    handleDismiss(suggestion.id)
  }

  const handleRefresh = () => {
    setDismissedSuggestions([])
    refresh()
  }

  return (
    <div className="relative liquid-glass-accent rounded-2xl sm:rounded-3xl p-6">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-black/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              AI Suggestions
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
        </div>
        <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">All caught up! No suggestions right now.</p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative liquid-glass-accent rounded-xl p-4 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getSuggestionColor(suggestion.priority)}`}>
                      {getTypeIcon(suggestion.type)}
                      <span className="ml-1 capitalize">{suggestion.type}</span>
                    </Badge>
                    <Badge className={`text-xs ${getSuggestionColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto rounded-md hover:bg-gray-100/60"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(suggestion.createdAt).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExecute(suggestion)}
                    className="px-3 py-1.5 bg-black text-white text-sm font-semibold rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] transition-all duration-200 flex items-center space-x-1 group/btn"
                  >
                    <span>{suggestion.action}</span>
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
        
        {suggestions.length > 0 && (
          <button 
            className="w-full px-4 py-2 bg-black text-white text-sm font-semibold rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] transition-all duration-200"
            onClick={handleRefresh}
          >
            Refresh Suggestions
          </button>
        )}
        </div>
      </div>
    </div>
  )
}