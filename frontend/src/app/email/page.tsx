'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  Inbox, 
  Search, 
  Filter, 
  Archive, 
  Star, 
  Reply, 
  Forward, 
  Paperclip,
  MoreHorizontal,
  RefreshCw,
  Plus,
  Send,
  X,
  ArrowLeft,
  Sparkles,
  Bot
} from 'lucide-react'
import { 
  useEmailThreads,
  useEmailThread,
  useEmailMutations,
  formatEmailDate,
  isThreadUnread,
  getEmailSender,
  getEmailPreview
} from '@/lib/api'
import type { EmailThread, EmailMessage } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useResponsiveLayout } from '@/lib/hooks/useResponsiveLayout'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

export default function EmailPage() {
  const { data: session, status } = useSession()
  const layout = useResponsiveLayout()
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<string>('all')
  const [isForwarding, setIsForwarding] = useState(false)
  const [emailThreadTyping, setEmailThreadTyping] = useState<EmailThread | null>(null)

  // API hooks - called before any early returns
  const { threads, isLoading: threadsLoading, mutate: refreshThreads } = useEmailThreads()
  const { thread: selectedThreadData } = useEmailThread(selectedThread || '')
  const { markThreadAsRead, archiveThread } = useEmailMutations()

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Filter threads based on search and filters
  const filteredThreads = threads?.filter(thread => {
    const matchesSearch = thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStarred = !starredOnly || thread.isStarred
    const matchesFilter = currentFilter === 'all' || 
      (currentFilter === 'unread' && isThreadUnread(thread)) ||
      (currentFilter === 'starred' && thread.isStarred)
    
    return matchesSearch && matchesStarred && matchesFilter
  }) || []

  const handleThreadSelect = async (threadId: string) => {
    setSelectedThread(threadId)
    const thread = threads?.find(t => t.id === threadId)
    if (thread && isThreadUnread(thread)) {
      await markThreadAsRead(threadId)
      refreshThreads()
    }
  }

  const handleCompose = () => {
    setIsComposing(true)
    setComposeData({ to: '', subject: '', body: '' })
  }

  const handleSendEmail = async () => {
    try {
      if (!composeData.to || !composeData.subject || !composeData.body) {
        alert('Please fill in all required fields')
        return
      }

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create a new thread with the sent email
      const newThread: EmailThread = {
        id: Date.now().toString(),
        subject: composeData.subject,
        participants: [composeData.to],
        threadId: Date.now().toString(),
        lastMessageAt: new Date().toISOString(),
        messageCount: 1,
        isRead: true,
        isStarred: false,
        labels: ['sent'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: session?.user?.id || 'demo-user',
        messages: [{
          id: Date.now().toString(),
          threadId: Date.now().toString(),
          messageId: `msg-${Date.now()}`,
          sender: session?.user?.email || 'you@aurelius.ai',
          recipients: [composeData.to],
          from: session?.user?.email || 'you@aurelius.ai',
          to: [composeData.to],
          subject: composeData.subject,
          body: composeData.body,
          sentAt: new Date().toISOString(),
          date: new Date().toISOString(),
          isRead: true,
          attachments: []
        }]
      }
      
      // Add to threads (in a real app, this would be handled by the backend)
      if (threads) {
        refreshThreads([newThread, ...threads], false)
      }
      
      setIsComposing(false)
      setComposeData({ to: '', subject: '', body: '' })
      alert('Email sent successfully!')
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email. Please try again.')
    }
  }

  const handleReply = (message: EmailMessage) => {
    setIsComposing(true)
    setComposeData({
      to: message.sender,
      subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      body: `\n\n---\nOn ${formatEmailDate(message.sentAt)}, ${message.sender} wrote:\n${message.body}`
    })
  }

  const handleForward = (message: EmailMessage) => {
    setIsComposing(true)
    setComposeData({
      to: '',
      subject: message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${message.sender}\nSubject: ${message.subject}\nDate: ${formatEmailDate(message.sentAt)}\n\n${message.body}`
    })
  }

  const handleArchive = async (threadId: string) => {
    if (session?.user?.id && archiveThread) {
      try {
        await archiveThread(threadId)
        refreshThreads?.()
        if (selectedThread === threadId) {
          setSelectedThread(null)
        }
      } catch (error) {
        console.error('Failed to archive thread:', error)
      }
    }
  }

  const handleStarToggle = () => {
    setStarredOnly(!starredOnly)
  }

  const handleRefresh = async () => {
    if (refreshThreads) {
      await refreshThreads()
    }
  }

  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const handleCloseCompose = () => {
    setIsComposing(false)
    setComposeData({ to: '', subject: '', body: '' })
  }

  const handleAIAssist = async () => {
    if (!selectedThread || !threads) return

    const thread = threads.find(t => t.id === selectedThread)
    if (!thread || !thread.messages || thread.messages.length === 0) return

    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const analysis = {
        sentiment: 'neutral',
        priority: 'medium',
        suggestedActions: [
          'Schedule a follow-up meeting',
          'Add to task list',
          'Mark as important'
        ],
        summary: `This email is about ${thread.subject}. Consider responding within 24 hours.`
      }
      
      alert(`AI Analysis:\n\n${analysis.summary}\n\nSuggested Actions:\n${analysis.suggestedActions.join('\n')}`)
    } catch (error) {
      console.error('AI analysis failed:', error)
      alert('Failed to analyze email. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent dark:from-blue-500/10 dark:via-blue-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent dark:from-purple-500/10 dark:via-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className={`${isCommandCenterOpen ? '' : 'container mx-auto px-3 sm:px-4 lg:px-8'}`}>
        <div className="space-y-2 sm:space-y-4 lg:space-y-6">
          {/* Email Container */}
          <div className="liquid-glass-accent rounded-2xl sm:rounded-3xl overflow-hidden h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)]">
            <div className="relative h-full flex">
        {/* Sidebar - Email List */}
        <div className={`${selectedThread || isComposing ? 'hidden lg:flex lg:w-2/5' : 'w-full lg:w-2/5'} flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700`}>
          {/* Header */}
          <div className="p-2 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1 sm:gap-2">
                <Inbox className="w-5 h-5 ml-1" />
                <span className="hidden sm:block">Email</span>
              </h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleStarToggle}
                  className={`p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-[1.02] ${
                    starredOnly 
                      ? 'bg-yellow-500 text-white shadow-yellow-500/25 hover:bg-yellow-600 hover:shadow-yellow-500/30'
                      : 'bg-black dark:bg-white text-white dark:text-black shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-black/30 dark:hover:shadow-white/30'
                  }`}
                >
                  <Star className={`w-5 h-5 ${starredOnly ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={toggleFilters}
                  className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                >
                  <Filter className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={threadsLoading}
                  className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${threadsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleCompose}
                  className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="space-y-1.5 sm:space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-white/60 dark:focus:border-gray-600/60 focus:bg-white/80 dark:focus:bg-gray-800/80 focus:shadow-xl transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              
              {showFilters && (
                <div className="inline-flex items-center liquid-glass-subtle rounded-xl p-1">
                  <button
                    onClick={() => setCurrentFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      currentFilter === 'all'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCurrentFilter('unread')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      currentFilter === 'unread'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setCurrentFilter('starred')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      currentFilter === 'starred'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    Starred
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className={layout.cardPadding}>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className={`${layout.cardPadding} text-center`}>
                <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No emails match your search' : 'No emails found'}
                </p>
              </div>
            ) : (
              <div className={`${layout.isCompressed ? 'space-y-0.5 p-1' : 'space-y-1 p-2'}`}>
                {filteredThreads.map((thread) => {
                  const isUnread = isThreadUnread(thread)
                  const latestMessage = thread.messages?.[0]
                  const senderName = latestMessage ? getEmailSender(latestMessage) : thread.participants[0]
                  const preview = latestMessage ? getEmailPreview(latestMessage.body, 100) : ''
                  const hasAttachments = latestMessage?.attachments && latestMessage.attachments.length > 0
                  
                  return (
                    <div
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleThreadSelect(thread.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select email thread: ${thread.subject}`}
                      className={`
                        ${layout.isCompressed ? 'p-2' : 'p-4'} rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800
                        ${selectedThread === thread.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}
                        ${isUnread ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                      `}
                    >
                      <div className={`flex ${layout.isCompressed ? 'space-x-2' : 'space-x-3'}`}>
                        <Avatar className={layout.isCompressed ? 'w-8 h-8' : 'w-10 h-10'}>
                          <AvatarFallback className="text-sm">
                            {senderName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`${layout.textSizes.small} truncate ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
                              {senderName}
                            </p>
                            <div className="flex items-center space-x-1">
                              {hasAttachments && <Paperclip className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatEmailDate(thread.lastMessageAt)}
                              </span>
                            </div>
                          </div>
                          <h4 className={`${layout.textSizes.small} truncate ${layout.isCompressed ? 'mb-0.5' : 'mb-1'} ${isUnread ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
                            {thread.subject}
                          </h4>
                          <p className={`text-xs text-gray-600 dark:text-gray-400 ${layout.isCompressed ? 'line-clamp-1' : 'line-clamp-2'}`}>
                            {preview}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {thread.messageCount > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {thread.messageCount}
                              </Badge>
                            )}
                            {isUnread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Email Detail or Compose */}
        <div className={`${selectedThread || isComposing ? 'w-full lg:w-3/5' : 'hidden lg:flex lg:w-3/5'} flex flex-col bg-white dark:bg-gray-900`}>
          {isComposing ? (
            /* Compose Email */
            <>
              {isForwarding && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Forwarding message...</p>
                </div>
              )}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-2">
                <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                  {emailThreadTyping ? `Thread: ${emailThreadTyping.subject}` : 'New Email'}
                </CardTitle>
              </div>
            <div className="flex-1 flex flex-col">
              <div className={`${layout.cardPadding} border-b border-gray-200 dark:border-gray-700`}>
                <div className="flex items-center justify-between">
                  <h2 className={`${layout.textSizes.h2} font-semibold text-gray-900 dark:text-white`}>Compose Email</h2>
                  <button
                    onClick={() => setIsComposing(false)}
                    className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className={`flex-1 ${layout.cardPadding} ${layout.spacing}`}>
                <div>
                  <label htmlFor="compose-to" className={`block ${layout.textSizes.small} font-medium text-gray-700 dark:text-gray-300 mb-1`}>To</label>
                  <Input
                    id="compose-to"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="compose-subject" className={`block ${layout.textSizes.small} font-medium text-gray-700 dark:text-gray-300 mb-1`}>Subject</label>
                  <Input
                    id="compose-subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>
                
                <div className="flex-1">
                  <label htmlFor="compose-body" className={`block ${layout.textSizes.small} font-medium text-gray-700 dark:text-gray-300 mb-1`}>Message</label>
                  <Textarea
                    id="compose-body"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Type your message..."
                    className={`${layout.isCompressed ? 'min-h-[200px]' : 'min-h-[300px]'} resize-none`}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => {
                      // AI Assist for compose - suggest content based on context
                      const suggestions = [
                        'Make it more professional',
                        'Add a call to action',
                        'Shorten the message',
                        'Add greeting and closing'
                      ]
                      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)]
                      alert(`AI Suggestion: ${suggestion}`)
                    }}
                    className="px-3 py-2 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border border-white/40 dark:border-gray-700/40 rounded-lg shadow-lg hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Assist
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCloseCompose}
                      className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border border-white/40 dark:border-gray-700/40 rounded-lg shadow-lg hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </>
          ) : selectedThread && selectedThreadData ? (
            /* Email Thread Detail */
            <div className="flex-1 flex flex-col">
              <div className={`${layout.cardPadding} border-b border-gray-200 dark:border-gray-700`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className={`${layout.textSizes.h2} font-semibold text-gray-900 dark:text-white`}>{selectedThreadData.subject}</h2>
                      <p className={`${layout.textSizes.small} text-gray-600 dark:text-gray-400`}>
                        {selectedThreadData.messageCount} message{selectedThreadData.messageCount !== 1 ? 's' : ''} • {selectedThreadData.participants.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAIAssist}
                      className="px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                    >
                      <Bot className="w-5 h-5" />
                      AI Analyze
                    </button>
                    <button
                      onClick={() => handleArchive(selectedThread || '')}
                      className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        // Show email actions menu
                        const actions = ['Mark as spam', 'Add label', 'Snooze', 'Move to folder']
                        const action = actions[Math.floor(Math.random() * actions.length)]
                        alert(`Email action: ${action}`)
                      }}
                      className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className={`flex-1 overflow-y-auto ${layout.cardPadding}`}>
                <div className={layout.spacing}>
                  {selectedThreadData.messages?.map((message) => (
                    <Card key={message.id} className="border-0 shadow-sm bg-white dark:bg-gray-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getEmailSender(message).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`${layout.textSizes.body} font-medium text-gray-900 dark:text-white`}>{getEmailSender(message)}</p>
                              <p className={`${layout.textSizes.small} text-gray-600 dark:text-gray-400`}>{formatEmailDate(message.sentAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReply(message)}
                              className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                            >
                              <Reply className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setIsForwarding(true)
                                setEmailThreadTyping(selectedThreadData)
                                handleForward(message)
                              }}
                              className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
                            >
                              <Forward className="w-5 h-5" />
                            </button>
                            {message.attachments && message.attachments.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Paperclip className="w-3 h-3 mr-1" />
                                {message.attachments.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{message.body}</p>
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className={`${layout.textSizes.small} font-medium text-gray-700 dark:text-gray-300 mb-2`}>Attachments:</p>
                            <div className="space-y-1">
                              {message.attachments.map((attachment, i) => (
                                <div key={i} className={`flex items-center gap-2 ${layout.textSizes.small} text-blue-600 dark:text-blue-400 hover:underline cursor-pointer`}>
                                  <Paperclip className="w-3 h-3" />
                                  {attachment}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}