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
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

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
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  
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
          <div className="flex items-center gap-3">
            <div className={`${isCommandCenterOpen ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-8 h-8'} bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/25 dark:shadow-white/25 flex-shrink-0`}>
              <Sparkles className={`${isCommandCenterOpen ? 'w-3 h-3 lg:w-3.5 lg:h-3.5' : 'w-4 h-4'} text-white dark:text-black`} />
            </div>
            <h3 className={`${isCommandCenterOpen ? 'text-base lg:text-lg' : 'text-lg sm:text-xl'} font-bold text-gray-900 dark:text-gray-100 tracking-tight whitespace-nowrap`}>
              {isCommandCenterOpen ? (
                <>
                  <span className="hidden sm:inline">AI Suggestions</span>
                  <span className="sm:hidden">AI</span>
                </>
              ) : (
                'AI Suggestions'
              )}
            </h3>
          </div>
          {/* Centered status indicators */}
          <div className="flex-1 flex justify-center items-center">
            {isLoading && !error && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
            )}
            {error && !isLoading && (
              <span title="Using cached data">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </span>
            )}
          </div>
          {/* Right side badge */}
          <div className="flex items-center">{" "}
            <div className={`${isCommandCenterOpen ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'} bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium rounded-full flex-shrink-0`}>
            <span className={isCommandCenterOpen ? 'hidden sm:inline' : ''}>{suggestions.length} active</span>
            <span className={isCommandCenterOpen ? 'sm:hidden' : 'hidden'}>{suggestions.length}</span>
            </div>
          </div>
        </div>
        <div className="space-y-4 min-h-[300px] sm:min-h-[400px] max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 styled-scrollbar">
        {suggestions.length === 0 ? (
          <div className="flex items-center justify-center min-h-[260px] sm:min-h-[360px]">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">All caught up! No suggestions right now.</p>
            </div>
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto rounded-md hover:bg-gray-100/60 dark:hover:bg-gray-800/60"
                  >
                    <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(suggestion.createdAt).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExecute(suggestion)}
                    className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-2xl shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 flex items-center space-x-1 group/btn"
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
            className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-900 to-black dark:from-gray-100 dark:to-white text-white dark:text-black text-sm font-semibold rounded-xl shadow-lg shadow-black/20 dark:shadow-white/20 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.01] transition-all duration-200"
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