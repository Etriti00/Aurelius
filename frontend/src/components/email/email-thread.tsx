'use client'

import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Reply, 
  Forward, 
  MoreHorizontal, 
  Star, 
  Archive,
  Trash2,
  Paperclip,
  Download,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock
} from 'lucide-react'
import { EmailThread, EmailMessage } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface EmailThreadProps {
  thread: EmailThread
  onReply?: (message: EmailMessage) => void
  onForward?: (message: EmailMessage) => void
  onArchive?: (threadId: string) => void
  onDelete?: (threadId: string) => void
  onToggleStar?: (threadId: string) => void
  className?: string
}

interface EmailMessageViewProps {
  message: EmailMessage
  isExpanded: boolean
  onToggle: () => void
  onReply?: () => void
  onForward?: () => void
  isLatest?: boolean
}

function EmailMessageView({ 
  message, 
  isExpanded, 
  onToggle, 
  onReply, 
  onForward,
  isLatest = false 
}: EmailMessageViewProps) {
  const senderEmail = message.sender
  const senderName = senderEmail.split('@')[0]
  const senderInitials = senderName
    .split('.')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded ? "shadow-md" : "shadow-sm hover:shadow-md",
      isLatest && "border-black/10"
    )}>
      <button
        type="button"
        className="p-4 cursor-pointer w-full text-left"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="font-medium text-sm truncate">
                  {senderName}
                </h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {senderEmail}
                </p>
                {message.recipients.length > 1 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    +{message.recipients.length - 1} others
                  </Badge>
                )}
              </div>
              
              {!isExpanded && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {message.body.slice(0, 100)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {message.attachments && message.attachments.length > 0 && (
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <>
          <Separator />
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: message.htmlBody || message.body.replace(/\n/g, '<br />') }}
                className="text-sm leading-relaxed"
              />
            </div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Attachments ({message.attachments.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.attachments.map((attachment, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{attachment}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle download
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onReply?.()
                }}
              >
                <Reply className="h-3 w-3 mr-1.5" />
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onForward?.()
                }}
              >
                <Forward className="h-3 w-3 mr-1.5" />
                Forward
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Mail className="h-4 w-4 mr-2" />
                    Mark as unread
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star className="h-4 w-4 mr-2" />
                    Add star
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export function EmailThreadView({ 
  thread, 
  onReply, 
  onForward, 
  onArchive, 
  onDelete,
  onToggleStar,
  className 
}: EmailThreadProps) {
  const messages = thread.messages || []
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set([messages[messages.length - 1]?.id].filter(Boolean))
  )

  const toggleMessage = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Thread Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold line-clamp-1">{thread.subject}</h2>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary" className="text-xs">
              <Mail className="h-3 w-3 mr-1" />
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Started {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStar?.(thread.id)}
          >
            <Star className={cn(
              "h-4 w-4",
              thread.isStarred && "fill-yellow-400 text-yellow-400"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive?.(thread.id)}
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(thread.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((message, index) => (
          <EmailMessageView
            key={message.id}
            message={message}
            isExpanded={expandedMessages.has(message.id)}
            onToggle={() => toggleMessage(message.id)}
            onReply={() => onReply?.(message)}
            onForward={() => onForward?.(message)}
            isLatest={index === messages.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default EmailThreadView