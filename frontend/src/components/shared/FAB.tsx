'use client'

import { useState } from 'react'
import { CommandModal } from './CommandModal'
import { VoiceCommand } from './VoiceCommand'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommandStore } from '@/lib/stores/commandStore'
import { useAICommand } from '@/lib/api'
import { useRouter } from 'next/navigation'
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
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'schedule',
    icon: Calendar,
    label: 'Schedule Meeting',
    command: 'schedule meeting',
    color: 'from-green-400 to-green-600'
  },
  {
    id: 'task',
    icon: CheckSquare,
    label: 'Create Task',
    command: 'create task',
    color: 'from-purple-400 to-purple-600'
  },
  {
    id: 'search',
    icon: Search,
    label: 'Search',
    command: 'search',
    color: 'from-yellow-400 to-yellow-600'
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Draft Email',
    command: 'draft email',
    color: 'from-red-400 to-red-600'
  }
]

export function FAB() {
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false)
  const { showQuickActions, toggleQuickActions, isProcessing, setProcessing, addRecentCommand } = useCommandStore()
  const { execute: executeCommand } = useAICommand()
  const router = useRouter()

  const handleFABClick = () => {
    if (showQuickActions) {
      setIsCommandModalOpen(true)
    } else {
      toggleQuickActions()
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
        case 'schedule':
          // Navigate to calendar first, then execute command
          router.push('/dashboard/calendar')
          // Give navigation time to complete
          setTimeout(async () => {
            try {
              await executeCommand({
                command: 'schedule meeting for next available time',
                context: { source: 'fab_quick_action', action: 'schedule' }
              })
            } catch (error) {
              // If command fails, still show calendar page
              console.warn('AI scheduling failed, showing calendar:', error)
            }
            setProcessing(false)
          }, 500)
          return // Exit early to prevent setProcessing(false) below
          
        case 'task':
          // Navigate to tasks first, then execute command  
          router.push('/dashboard/tasks')
          setTimeout(async () => {
            try {
              await executeCommand({
                command: 'create a new high priority task',
                context: { source: 'fab_quick_action', action: 'create_task' }
              })
            } catch (error) {
              console.warn('AI task creation failed, showing tasks page:', error)
            }
            setProcessing(false)
          }, 500)
          return
          
        case 'search':
          // Open command modal for search
          setIsCommandModalOpen(true)
          break
          
        case 'email':
          // Navigate to inbox first, then execute command
          router.push('/dashboard/inbox')
          setTimeout(async () => {
            try {
              await executeCommand({
                command: 'draft a professional email',
                context: { source: 'fab_quick_action', action: 'draft_email' }
              })
            } catch (error) {
              console.warn('AI email drafting failed, showing inbox:', error)
            }
            setProcessing(false)
          }, 500)
          return
          
        default:
          // Fallback to command modal
          setIsCommandModalOpen(true)
      }
    } catch (error) {
      console.error('Quick action navigation failed:', error)
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
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={handleClickOutside}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-6 left-[calc(100%-7rem)] sm:bottom-8 sm:left-[calc(100%-8.5rem)] z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1.15 }}
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
                      x: 20, 
                      opacity: 0,
                      rotate: -10 
                    }}
                    animate={{ 
                      scale: 1, 
                      x: 0, 
                      opacity: 1,
                      rotate: 0
                    }}
                    exit={{ 
                      scale: 0, 
                      x: 20, 
                      opacity: 0,
                      rotate: 10
                    }}
                    transition={{ 
                      delay: index * 0.1, 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 25 
                    }}
                    className="flex items-center space-x-3"
                  >
                    {/* Action Label */}
                    <motion.div
                      className="bg-black text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                      whileHover={{ scale: 1.05 }}
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
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md bg-white/30 shadow-lg flex items-center justify-center relative overflow-hidden`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.color}`} />
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
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
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-transparent backdrop-blur-xl shadow-2xl shadow-gray-400/20 overflow-hidden hover:shadow-xl transition-all duration-500 group relative"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ right: showQuickActions ? '10px' : '0px' }} // Adjust positioning when quick actions are open
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/60 to-white/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-50/20 to-amber-50/30" />
          
          {/* Tooltip */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Ask Aurelius
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
          
          {/* Main Icon */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {showQuickActions ? (
              <motion.div
                animate={{
                  rotate: 45
                }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-bold bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800 bg-clip-text text-transparent"
              >
                ×
              </motion.div>
            ) : (
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
            )}
          </div>
          
        </motion.button>
      </motion.div>

      <CommandModal 
        open={isCommandModalOpen} 
        onOpenChange={setIsCommandModalOpen} 
      />
    </>
  )
}