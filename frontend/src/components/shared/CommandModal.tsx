'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Calendar, 
  Mail, 
  CheckSquare, 
  Sparkles, 
  Clock,
  Send,
  Command,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAICommand, getCommandSuggestions } from '@/lib/api'

interface CommandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const quickActions = [
  { icon: Calendar, label: 'Schedule meeting', command: 'schedule' },
  { icon: Mail, label: 'Draft email', command: 'email' },
  { icon: CheckSquare, label: 'Create task', command: 'task' },
  { icon: Search, label: 'Search everything', command: 'search' },
]

const recentCommands = [
  'Schedule meeting with John next week',
  'Draft reply to Sarah about project update',
  'Show me tasks due today',
  'Find emails from yesterday',
]

export function CommandModal({ open, onOpenChange }: CommandModalProps) {
  const [command, setCommand] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { execute: executeCommand, isLoading: commandLoading, error: commandError } = useAICommand()

  useEffect(() => {
    if (open) {
      setCommand('')
      setIsProcessing(false)
      setSuggestions([])
      setResult(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    // Get AI suggestions based on input
    const getSuggestions = async () => {
      if (command.length > 2) {
        try {
          const aiSuggestions = await getCommandSuggestions(command)
          setSuggestions(aiSuggestions.slice(0, 3)) // Show top 3 suggestions
        } catch (error) {
          // Fallback to enhanced suggestions on error
          const fallbackSuggestions = [
            `${command} with AI assistance`,
            `${command} for tomorrow`,
            `${command} and send notification`,
          ]
          setSuggestions(fallbackSuggestions)
        }
      } else {
        setSuggestions([])
      }
    }

    const timeoutId = setTimeout(getSuggestions, 300) // Debounce API calls
    return () => clearTimeout(timeoutId)
  }, [command])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim() || isProcessing || commandLoading) return

    setIsProcessing(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await executeCommand({
        command: command.trim(),
        context: { source: 'dashboard' }
      })
      
      setResult(response.content || 'Command executed successfully')
      
      // Auto-close modal after 2 seconds if successful
      setTimeout(() => {
        setIsProcessing(false)
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to execute command')
      setIsProcessing(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setCommand(`${action}: `)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 glass-strong">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Command Center</h2>
              <p className="text-sm text-gray-500">
                Tell Aurelius what you need, and it will handle the rest
              </p>
            </div>
          </div>
        </div>

        {/* Command Input */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="What would you like me to do? (e.g., Schedule a meeting with John for next week)"
                className="text-lg pr-12 glass"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!command.trim() || isProcessing || commandLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {(isProcessing || commandLoading) ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* AI Processing State */}
            <AnimatePresence>
              {(isProcessing || commandLoading) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass p-4 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Processing your request...</p>
                      <p className="text-xs text-blue-600">Aurelius is analyzing and executing your command</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Success Result */}
            <AnimatePresence>
              {result && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass p-4 rounded-lg border border-green-200 bg-green-50"
                >
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Command executed successfully</p>
                      <p className="text-xs text-green-700 mt-1">{result}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Error State */}
            <AnimatePresence>
              {(error || commandError) && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass p-4 rounded-lg border border-red-200 bg-red-50"
                >
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Command failed</p>
                      <p className="text-xs text-red-700 mt-1">{error || commandError}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && !isProcessing && !commandLoading && !result && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Suggestions</p>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setCommand(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Quick Actions */}
        {!command && !isProcessing && !commandLoading && !result && (
          <div className="px-6 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.command}
                  onClick={() => handleQuickAction(action.label)}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <action.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-900">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Commands */}
        {!command && !isProcessing && !commandLoading && !result && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Commands</p>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                {recentCommands.map((recentCommand, index) => (
                  <button
                    key={index}
                    onClick={() => setCommand(recentCommand)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {recentCommand}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Command className="w-3 h-3" />
              <span>Powered by Claude Sonnet 4</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Press Enter to execute</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}