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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function EmailPage() {
  const { data: session, status } = useSession()
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
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
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
      // This would integrate with the email API
      // TODO: Implement actual email sending functionality
      setIsComposing(false)
      setComposeData({ to: '', subject: '', body: '' })
    } catch (error) {
      console.error('Failed to send email:', error)
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
    // This would integrate with the AI API to analyze the email and suggest actions
    // TODO: Implement AI email analysis functionality
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className="relative h-screen flex">
        {/* Sidebar - Email List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Inbox className="w-6 h-6" />
                Email
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStarToggle}
                  className={starredOnly ? 'text-yellow-600' : ''}
                >
                  <Star className={`w-4 h-4 ${starredOnly ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFilters}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={threadsLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${threadsLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" onClick={handleCompose}>
                  <Plus className="w-4 h-4 mr-1" />
                  Compose
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {showFilters && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={currentFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setCurrentFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={currentFilter === 'unread' ? 'default' : 'outline'}
                    onClick={() => setCurrentFilter('unread')}
                  >
                    Unread
                  </Button>
                  <Button
                    size="sm"
                    variant={currentFilter === 'starred' ? 'default' : 'outline'}
                    onClick={() => setCurrentFilter('starred')}
                  >
                    Starred
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No emails match your search' : 'No emails found'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
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
                        p-4 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50
                        ${selectedThread === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                        ${isUnread ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      <div className="flex space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm">
                            {senderName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                              {senderName}
                            </p>
                            <div className="flex items-center space-x-1">
                              {hasAttachments && <Paperclip className="w-3 h-3 text-gray-400" />}
                              <span className="text-xs text-gray-500">
                                {formatEmailDate(thread.lastMessageAt)}
                              </span>
                            </div>
                          </div>
                          <h4 className={`text-sm truncate mb-1 ${isUnread ? 'font-semibold' : ''}`}>
                            {thread.subject}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">
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
        <div className="flex-1 flex flex-col">
          {isComposing ? (
            /* Compose Email */
            <>
              {isForwarding && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
                  <p className="text-sm text-yellow-800">Forwarding message...</p>
                </div>
              )}
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
                <CardTitle className="text-sm text-blue-800">
                  {emailThreadTyping ? `Thread: ${emailThreadTyping.subject}` : 'New Email'}
                </CardTitle>
              </div>
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Compose Email</h2>
                  <Button variant="ghost" size="sm" onClick={() => setIsComposing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 p-6 space-y-4">
                <div>
                  <label htmlFor="compose-to" className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <Input
                    id="compose-to"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="compose-subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <Input
                    id="compose-subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>
                
                <div className="flex-1">
                  <label htmlFor="compose-body" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <Textarea
                    id="compose-body"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Type your message..."
                    className="min-h-[300px] resize-none"
                  />
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Assist
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCloseCompose}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendEmail} className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </>
          ) : selectedThread && selectedThreadData ? (
            /* Email Thread Detail */
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedThreadData.subject}</h2>
                      <p className="text-sm text-gray-600">
                        {selectedThreadData.messageCount} message{selectedThreadData.messageCount !== 1 ? 's' : ''} • {selectedThreadData.participants.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handleAIAssist}>
                      <Bot className="w-4 h-4 mr-1" />
                      AI Analyze
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(selectedThread || '')}>
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {selectedThreadData.messages?.map((message) => (
                    <Card key={message.id} className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getEmailSender(message).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{getEmailSender(message)}</p>
                              <p className="text-sm text-gray-600">{formatEmailDate(message.sentAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleReply(message)}>
                              <Reply className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setIsForwarding(true)
                              setEmailThreadTyping(selectedThreadData)
                              handleForward(message)
                            }}>
                              <Forward className="w-4 h-4" />
                            </Button>
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
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{message.body}</p>
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                            <div className="space-y-1">
                              {message.attachments.map((attachment, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer">
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
          ) : (
            /* No Thread Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an email to read
                </h3>
                <p className="text-gray-600">
                  Choose an email from the list to view its content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}