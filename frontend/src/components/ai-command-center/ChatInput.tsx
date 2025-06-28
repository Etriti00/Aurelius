'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAICommandCenter, type ContextAction } from '@/lib/stores/aiCommandCenterStore'

interface ChatInputProps {
  message?: string
  setMessage?: (message: string) => void
  isProcessing?: boolean
  onSend?: () => void
}

export function ChatInput({ message: externalMessage, setMessage: externalSetMessage, isProcessing: externalIsProcessing, onSend: externalOnSend }: ChatInputProps) {
  const [internalMessage, setInternalMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { 
    isProcessing: storeIsProcessing, 
    currentContext, 
    addMessage, 
    setProcessing
  } = useAICommandCenter()

  // Use external props if provided, otherwise use internal state
  const message = externalMessage !== undefined ? externalMessage : internalMessage
  const setMessage = externalSetMessage || setInternalMessage
  const isProcessing = externalIsProcessing !== undefined ? externalIsProcessing : storeIsProcessing

  const handleSend = async () => {
    if (!message.trim() || isProcessing) return
    
    if (externalOnSend) {
      externalOnSend()
      return
    }
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date()
    }
    
    addMessage(userMessage)
    setMessage('')
    setProcessing(true)
    
    // TODO: Send message to AI backend
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'I received your message. This is a placeholder response.',
        timestamp: new Date()
      }
      addMessage(assistantMessage)
      setProcessing(false)
    }, 1000)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const handleQuickAction = (action: ContextAction) => {
    setMessage(action.command)
    // Auto-send for quick actions
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  return (
    <div className="relative h-full flex flex-col justify-center">
      {/* Quick actions and context indicator row aligned with main content container */}
      <div className="flex-shrink-0 mb-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8" style={{ marginLeft: '1.5mm', marginRight: '1.5mm' }}>
          <div className="flex items-start justify-between">
            {/* Quick actions on the left */}
            <div className="flex-1">
              <AnimatePresence>
                {currentContext && currentContext.availableActions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {currentContext.availableActions.slice(0, 4).map((action, index) => (
                        <motion.button
                          key={action.command}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleQuickAction(action)}
                          className="px-3 py-1.5 liquid-glass-subtle text-gray-600 dark:text-gray-400 rounded-xl hover:liquid-glass-accent hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-300 text-xs font-medium whitespace-nowrap shadow-lg"
                        >
                          {action.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Smart context indicator - moved more to the left */}
            <div className="flex-shrink-0" style={{ marginRight: '15px' }}>
              <AnimatePresence>
                {currentContext && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-lg px-3 py-2 shadow-sm">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 capitalize">
                        {currentContext.page}
                      </div>
                      {currentContext.selectedItem && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-32">
                          {currentContext.selectedItem}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input container aligned with main content container */}
      <div className="flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8" style={{ marginLeft: '0mm', marginRight: '2mm' }}>
          <div className="relative" style={{ marginRight: '7px' }}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Aurelius..."
              className="w-full h-16 sm:h-20 px-3 sm:px-4 py-2 sm:py-3 pr-16 sm:pr-20 liquid-glass rounded-xl sm:rounded-2xl shadow-lg focus:outline-none focus:liquid-glass-accent focus:shadow-2xl transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 resize-none font-medium text-sm sm:text-base"
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
            
            {/* Character count */}
            <div className="absolute bottom-3 right-4 text-xs font-medium text-gray-400 dark:text-gray-500">
              {message.length}/2000
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}

