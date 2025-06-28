'use client'

import React, { useState } from 'react'
import { CommandModal } from './CommandModal'
import { VoiceCommand } from './VoiceCommand'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommandStore } from '@/lib/stores/commandStore'
import { useAICommand } from '@/lib/api'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'
import { usePathname } from 'next/navigation'
// import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Mail, 
  CheckSquare, 
  Search, 
  MessageSquare
} from 'lucide-react'
import { BrainIcon } from './BrainIcon'

interface QuickAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  command: string
  color: string
}

const quickActions: QuickAction[] = [
  {
    id: 'voice',
    icon: MessageSquare,
    label: 'Voice Command',
    command: 'voice',
    color: 'special' // Keep voice button special
  },
  {
    id: 'schedule',
    icon: Calendar,
    label: 'Schedule Meeting',
    command: 'schedule meeting',
    color: 'standard'
  },
  {
    id: 'task',
    icon: CheckSquare,
    label: 'Create Task',
    command: 'create task',
    color: 'standard'
  },
  {
    id: 'search',
    icon: Search,
    label: 'Search',
    command: 'search',
    color: 'standard'
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Draft Email',
    command: 'draft email',
    color: 'standard'
  }
]

export function FAB() {
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false)
  const { showQuickActions, toggleQuickActions, isProcessing, setProcessing, addRecentCommand } = useCommandStore()
  const { execute: executeCommand } = useAICommand()
  const { isOpen: isCommandCenterOpen, toggle: toggleCommandCenter } = useAICommandCenter()
  const pathname = usePathname()

  // Hide FAB on specific pages where it shouldn't appear
  const hiddenRoutes = [
    '/integrations',
    '/billing', 
    '/dashboard/settings',
    '/settings' // In case settings is at root level
  ]
  
  const shouldHideFAB = hiddenRoutes.some(route => pathname.startsWith(route))
  
  // Auto-close command center when navigating to forbidden pages
  React.useEffect(() => {
    if (shouldHideFAB && isCommandCenterOpen) {
      toggleCommandCenter() // Close command center when navigating to hidden routes
    }
  }, [shouldHideFAB, isCommandCenterOpen, toggleCommandCenter])
  
  if (shouldHideFAB) {
    return null
  }

  const handleFABClick = () => {
    // Toggle command center instead of quick actions
    toggleCommandCenter()
  }

  const handleScheduleAction = () => {
    const title = prompt('Event title:')
    if (title) {
      const startTime = prompt('Start time (HH:MM):')
      const date = prompt('Date (YYYY-MM-DD):') ?? new Date().toISOString().split('T')[0]
      if (startTime) {
        alert(`Creating event: "${title}" on ${date} at ${startTime}`)
        // In real app, this would create the event via API
      }
    }
  }

  const handleTaskAction = () => {
    const taskTitle = prompt('Task title:')
    if (taskTitle) {
      const taskDescription = prompt('Task description (optional):')
      const priority = prompt('Priority (high/medium/low):') ?? 'medium'
      alert(`Creating task: "${taskTitle}"\nDescription: ${taskDescription ?? 'None'}\nPriority: ${priority}`)
      // In real app, this would create the task via API
    }
  }

  const handleSearchAction = () => {
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }

  const handleEmailAction = () => {
    const recipient = prompt('To:')
    if (recipient) {
      const subject = prompt('Subject:')
      if (subject) {
        const body = prompt('Message:')
        alert(`Composing email:\nTo: ${recipient}\nSubject: ${subject}\nMessage: ${body ?? '(empty)'}`)
        // In real app, this would open email composer or send email
      }
    }
  }

  const handleQuickAction = async (action: QuickAction) => {
    if (action.id === 'voice') {
      // Voice action is handled by the VoiceCommand component
      return
    }
    
    // Close quick actions first
    toggleQuickActions()
    addRecentCommand(action.command)
    
    // Add small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      setProcessing(true)
      
      switch (action.id) {
        case 'schedule': {
          handleScheduleAction()
          break
        }
        case 'task': {
          handleTaskAction()
          break
        }
        case 'search': {
          handleSearchAction()
          break
        }
        case 'email': {
          handleEmailAction()
          break
        }
        default: {
          // Fallback to command modal
          setIsCommandModalOpen(true)
          break
        }
      }
    } catch (error) {
      // Fallback to command modal on navigation error
      setIsCommandModalOpen(true)
    } finally {
      setProcessing(false)
    }
  }

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return
    
    setProcessing(true)
    addRecentCommand(command)
    
    try {
      await executeCommand({
        command: command.trim(),
        context: { source: 'voice' }
      })
    } catch (error) {
      console.error('Voice command failed:', error)
    } finally {
      setProcessing(false)
      toggleQuickActions() // Close quick actions after voice command
    }
  }

  const handleClickOutside = () => {
    if (showQuickActions) {
      toggleQuickActions()
    }
  }

  return (
    <>
      {/* Backdrop for quick actions */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
            onClick={handleClickOutside}
          />
        )}
      </AnimatePresence>

      {/* Hide FAB when command center is open */}
      {!isCommandCenterOpen && (
        <motion.div
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        >
        {/* Quick Actions */}
        <AnimatePresence>
          {showQuickActions && (
            <div className="absolute bottom-20 right-0 space-y-3">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon
                const isVoiceAction = action.id === 'voice'
                
                return (
                  <motion.div
                    key={action.id}
                    initial={{ 
                      scale: 0, 
                      x: 50, 
                      opacity: 0,
                      y: 20,
                      rotate: 45
                    }}
                    animate={{ 
                      scale: 1, 
                      x: 0, 
                      opacity: 1,
                      y: 0,
                      rotate: 0
                    }}
                    exit={{ 
                      scale: 0, 
                      x: 50, 
                      opacity: 0,
                      y: 20,
                      rotate: -45
                    }}
                    transition={{ 
                      delay: index * 0.05, 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 25,
                      mass: 0.6
                    }}
                    className="flex items-center space-x-4"
                  >
                    {/* Action Label */}
                    <motion.div
                      className="bg-black dark:bg-white text-white dark:text-black text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 whitespace-nowrap backdrop-blur-xl"
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      {action.label}
                    </motion.div>
                    
                    {/* Action Button */}
                    {isVoiceAction ? (
                      <VoiceCommand 
                        onCommand={handleVoiceCommand}
                        isProcessing={isProcessing}
                      />
                    ) : (
                      <motion.button
                        onClick={() => handleQuickAction(action)}
                        className="w-12 h-12 rounded-full bg-black dark:bg-white shadow-lg shadow-black/25 dark:shadow-white/25 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 flex items-center justify-center backdrop-blur-xl border border-white/20 dark:border-black/20"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                      >
                        <IconComponent className="w-5 h-5 text-white dark:text-black" />
                      </motion.button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={handleFABClick}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border border-white/30 dark:border-gray-800/30 shadow-2xl hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ right: showQuickActions ? '10px' : '0px' }} // Adjust positioning when quick actions are open
        >
          {/* Subtle inner glow matching dashboard design */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          
          {/* Tooltip */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium px-3 py-2 rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            {(() => {
              if (isCommandCenterOpen) return 'Close Aurelius'
              if (showQuickActions) return 'Close Actions'
              return 'Ask Aurelius'
            })()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-white"></div>
          </div>
          
          {/* Main Icon */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {(() => {
              if (isCommandCenterOpen) {
                return (
                  <motion.div
                    animate={{
                      rotate: 0,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 0.3, ease: 'easeInOut' },
                      scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                    className="text-2xl font-bold bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800 bg-clip-text text-transparent"
                  >
                    ×
                  </motion.div>
                )
              }
              
              if (showQuickActions) {
                return (
                  <motion.div
                    animate={{
                      rotate: 45,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 0.3, ease: 'easeInOut' },
                      scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                    className="text-xl font-bold bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800 bg-clip-text text-transparent"
                  >
                    ×
                  </motion.div>
                )
              }
              
              return (
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative z-10"
                >
                  <BrainIcon size="md" static={true} />
                </motion.div>
              )
            })()}
          </div>
          
        </motion.button>
      </motion.div>
      )}

      <CommandModal 
        open={isCommandModalOpen} 
        onOpenChange={setIsCommandModalOpen} 
      />
    </>
  )
}