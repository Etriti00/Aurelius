'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Inbox, Star, Paperclip, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  useRecentThreads, 
  useEmailMutations, 
  getEmailPreview, 
  formatEmailDate, 
  isThreadUnread, 
  getEmailSender,
  getEmailImportance,
  EmailThread 
} from '@/lib/api'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

// Mock data for fallback when API is not available
const mockRecentEmails: EmailThread[] = [
  {
    id: '1',
    subject: 'Project Update Required',
    participants: ['sarah@example.com'],
    provider: 'gmail',
    threadId: 'mock-thread-1',
    messageCount: 1,
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    metadata: {},
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [{
      id: 'msg-1',
      threadId: '1',
      messageId: 'mock-msg-1',
      sender: 'sarah@example.com',
      recipients: ['user@example.com'],
      subject: 'Project Update Required',
      body: 'Hi, I need the latest updates on the Q4 project. Can you please send me the current status and timeline?',
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      attachments: [],
      metadata: {},
    }]
  },
  {
    id: '2',
    subject: 'Meeting Reschedule',
    participants: ['john@example.com'],
    provider: 'gmail',
    threadId: 'mock-thread-2',
    messageCount: 1,
    lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    metadata: {},
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [{
      id: 'msg-2',
      threadId: '2',
      messageId: 'mock-msg-2',
      sender: 'john@example.com',
      recipients: ['user@example.com'],
      subject: 'Meeting Reschedule',
      body: 'Our meeting scheduled for tomorrow needs to be moved to next week due to a conflict.',
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      attachments: ['document.pdf'],
      metadata: {},
    }]
  },
  {
    id: '3',
    subject: 'Budget Approval',
    participants: ['emily@example.com'],
    provider: 'gmail',
    threadId: 'mock-thread-3',
    messageCount: 1,
    lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    metadata: {},
    userId: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [{
      id: 'msg-3',
      threadId: '3',
      messageId: 'mock-msg-3',
      sender: 'emily@example.com',
      recipients: ['user@example.com'],
      subject: 'Budget Approval',
      body: 'The budget for the new initiative has been approved. Please find the details attached.',
      sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      attachments: ['budget.xlsx'],
      metadata: {},
    }]
  }
]

export function InboxWidget() {
  // Fetch real email threads from API
  const { threads: apiThreads, isLoading, error, refresh } = useRecentThreads(5)
  const { markThreadAsRead } = useEmailMutations()
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  
  // Use real data if available, otherwise fallback to mock data
  const emailThreads = error || !apiThreads ? mockRecentEmails : apiThreads
  
  const handleMarkAsRead = async (threadId: string) => {
    try {
      await markThreadAsRead(threadId)
      refresh()
    } catch (error) {
      console.error('Failed to mark thread as read:', error)
    }
  }
  return (
    <div className="relative liquid-glass-accent rounded-2xl sm:rounded-3xl p-6">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`${isCommandCenterOpen ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-8 h-8'} bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/25 dark:shadow-white/25 flex-shrink-0`}>
              <Inbox className={`${isCommandCenterOpen ? 'w-3 h-3 lg:w-3.5 lg:h-3.5' : 'w-4 h-4'} text-white dark:text-black`} />
            </div>
            <h3 className={`${isCommandCenterOpen ? 'text-base lg:text-lg' : 'text-lg sm:text-xl'} font-bold text-gray-900 dark:text-gray-100 tracking-tight whitespace-nowrap`}>
              {isCommandCenterOpen ? (
                <>
                  <span className="hidden sm:inline">Recent Emails</span>
                  <span className="sm:hidden">Emails</span>
                </>
              ) : (
                'Recent Emails'
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
            <div className={`${isCommandCenterOpen ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium rounded-full flex-shrink-0`}>
            <span className={isCommandCenterOpen ? 'hidden sm:inline' : ''}>{emailThreads.filter(thread => isThreadUnread(thread)).length} unread</span>
            <span className={isCommandCenterOpen ? 'sm:hidden' : 'hidden'}>{emailThreads.filter(thread => isThreadUnread(thread)).length}</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 min-h-[300px] sm:min-h-[400px] max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 styled-scrollbar">
        {emailThreads.length === 0 ? (
          <div className="flex items-center justify-center min-h-[260px] sm:min-h-[360px]">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">No recent emails</p>
            </div>
          </div>
        ) : (
          emailThreads.map((thread, index) => {
            const latestMessage = thread.messages?.[0]
            const threadUnread = isThreadUnread(thread)
            const senderName = latestMessage ? getEmailSender(latestMessage) : (thread.participants[0] || 'Unknown')
            const preview = latestMessage ? getEmailPreview(latestMessage.body, 80) : 'No message content'
            const importance = latestMessage ? getEmailImportance(latestMessage) : 'normal'
            const hasAttachments = latestMessage ? (latestMessage.attachments && latestMessage.attachments.length > 0) : false
            
            return (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer group ${
                  threadUnread ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => threadUnread && handleMarkAsRead(thread.id)}
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          threadUnread ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {senderName}
                        </p>
                        <div className="flex items-center space-x-1">
                          {importance === 'high' && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                          {hasAttachments && (
                            <Paperclip className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatEmailDate(thread.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                      
                      <h4 className={`text-sm truncate ${
                        threadUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'
                      }`}>
                        {thread.subject}
                      </h4>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {preview}
                      </p>
                      
                      {thread.messageCount > 1 && (
                        <div className="flex items-center mt-2">
                          <Badge variant="outline" className="text-xs">
                            {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        
        <button 
          onClick={() => {
            // Navigate to full inbox view
            window.location.href = '/email'
          }}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-900 to-black dark:from-gray-100 dark:to-white text-white dark:text-black text-sm font-semibold rounded-xl shadow-lg shadow-black/20 dark:shadow-white/20 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.01] transition-all duration-200 flex items-center justify-center space-x-2 group"
        >
          <span>Open Inbox</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        </div>
      </div>
    </div>
  )
}