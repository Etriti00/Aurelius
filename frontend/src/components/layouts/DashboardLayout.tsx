'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  LayoutDashboard, 
  Inbox, 
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Zap,
  CreditCard,
  Link2,
  Send,
  Mic,
  Paperclip,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FAB } from '@/components/shared/FAB'
import { WebSocketIndicator } from '@/components/shared/WebSocketIndicator'
import { Brain3DLogo } from '@/components/shared/Brain3DLogo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'
import { motion, AnimatePresence } from 'framer-motion'
import { layoutTransition } from '@/lib/utils/animations'
import { ArtifactsPanel } from '@/components/ai-command-center/ArtifactsPanel'
import { ChatInput } from '@/components/ai-command-center/ChatInput'
import { ChatActions } from '@/components/ai-command-center/ChatActions'
import { useContextDetection } from '@/lib/hooks/useContextDetection'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Email', href: '/email', icon: Inbox },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Workflows', href: '/workflows', icon: Zap },
  { name: 'Integrations', href: '/integrations', icon: Link2 },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen: isCommandCenterOpen, addMessage, setProcessing, close: closeCommandCenter, currentContext } = useAICommandCenter()
  
  // Enable context detection
  useContextDetection()

  // Auto-close command center when navigating to restricted pages
  const restrictedRoutes = [
    '/integrations',
    '/billing', 
    '/dashboard/settings',
    '/settings'
  ]
  
  const shouldCloseCommandCenter = restrictedRoutes.some(route => pathname.startsWith(route))
  
  React.useEffect(() => {
    if (shouldCloseCommandCenter && isCommandCenterOpen) {
      closeCommandCenter()
    }
  }, [shouldCloseCommandCenter, isCommandCenterOpen, closeCommandCenter])

  const handleSend = async () => {
    if (!message.trim() || isProcessing) return
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date()
    }
    
    addMessage(userMessage)
    setMessage('')
    setIsProcessing(true)
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
      setIsProcessing(false)
      setProcessing(false)
    }, 1000)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Mobile wrapper to ensure proper layout */}
      <div className="h-full flex relative">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
              aria-label="Close mobile menu"
            />
          </div>
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50',
            'lg:relative lg:z-auto',
            'flex flex-col backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-r border-white/30 dark:border-gray-800/30',
            'transition-all duration-300 ease-in-out shadow-lg',
            sidebarCollapsed ? 'w-20' : 'w-64',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
        {/* Subtle inner glow matching dashboard widgets */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        {/* Sidebar header */}
        <div className="relative flex items-center h-16 px-4 border-b border-white/30 dark:border-gray-800/30">
          <div className="flex items-center flex-1">
            {!sidebarCollapsed ? (
              <Brain3DLogo size="sm" static={true} href="/dashboard" className="flex-nowrap" />
            ) : (
              <Brain3DLogo size="sm" static={true} showText={false} href="/dashboard" className="flex-nowrap" />
            )}
          </div>
          
          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "hidden lg:flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200 group",
              sidebarCollapsed ? "ml-2" : "ml-0"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <ChevronLeft className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'relative bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/25 dark:shadow-white/25'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-800/60 backdrop-blur-sm',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn('w-5 h-5', sidebarCollapsed ? '' : 'mr-3')} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="relative border-t border-white/30 dark:border-gray-800/30 p-4">
          <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'space-x-3')}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.email}
                </p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="w-full mt-3 px-3 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 flex items-center justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          )}
        </div>
      </div>

        {/* Main content - full width on mobile */}
        <div className="absolute inset-0 lg:relative lg:flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header - fixed height */}
        <header className="relative backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-b border-white/30 dark:border-gray-800/30 shadow-lg flex-shrink-0">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className={cn(
            "h-16 flex transition-all duration-300",
            isCommandCenterOpen ? "lg:pr-[35%]" : ""
          )}>
            <div className={cn(
              "flex-1 container mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300",
              isCommandCenterOpen ? "lg:max-w-none" : ""
            )}>
              <div className="flex items-center justify-between h-full">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search bar - hidden on mobile */}
            <div className="hidden sm:flex flex-1 max-w-lg mx-4 -ml-0.5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-white/60 dark:focus:border-gray-600/60 focus:bg-white/80 dark:focus:bg-gray-800/80 focus:shadow-xl transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Header actions - aligned with container */}
            <div className="relative flex items-center space-x-2 sm:space-x-3" style={{ 
              marginRight: isCommandCenterOpen ? 'calc(1.6mm + 5px)' : '1.6mm' 
            }}>
              <div className="hidden sm:block">
                <WebSocketIndicator />
              </div>
              <ThemeToggle variant="minimal" />
              
              <button 
                onClick={(e) => {
                  // Open notifications dropdown/panel
                  const button = e.currentTarget
                  const rect = button.getBoundingClientRect()
                  const notificationsPanel = document.createElement('div')
                  
                  // Position relative to button
                  const rightOffset = window.innerWidth - rect.right
                  const topOffset = rect.bottom + 8
                  
                  notificationsPanel.className = 'fixed w-[calc(100vw-1rem)] sm:w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/30 dark:border-gray-800/30 backdrop-blur-xl z-[60] p-3 sm:p-4 max-h-[80vh] overflow-y-auto'
                  notificationsPanel.style.top = `${topOffset}px`
                  notificationsPanel.style.right = `${rightOffset}px`
                  notificationsPanel.style.left = window.innerWidth < 640 ? '0.5rem' : 'auto'
                  notificationsPanel.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                      <button onclick="this.parentElement.parentElement.remove()" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                    <div class="space-y-3">
                      <div class="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                        <p class="text-sm font-medium text-blue-900 dark:text-blue-100">New email from Sarah</p>
                        <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">Project update required - 2 min ago</p>
                      </div>
                      <div class="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                        <p class="text-sm font-medium text-green-900 dark:text-green-100">Task completed</p>
                        <p class="text-xs text-green-600 dark:text-green-400 mt-1">Budget analysis finished - 5 min ago</p>
                      </div>
                      <div class="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                        <p class="text-sm font-medium text-purple-900 dark:text-purple-100">Meeting reminder</p>
                        <p class="text-xs text-purple-600 dark:text-purple-400 mt-1">Team sync in 15 minutes</p>
                      </div>
                    </div>
                    <button class="w-full mt-4 px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg shadow-lg transition-all duration-200">
                      View All Notifications
                    </button>
                  `
                  document.body.appendChild(notificationsPanel)
                  
                  // Remove on click outside
                  setTimeout(() => {
                    const handleClickOutside = (e: MouseEvent) => {
                      if (!notificationsPanel.contains(e.target as Node)) {
                        notificationsPanel.remove()
                        document.removeEventListener('click', handleClickOutside)
                      }
                    }
                    document.addEventListener('click', handleClickOutside)
                  }, 100)
                }}
                className="relative p-2 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-all duration-200 backdrop-blur-sm"
              >
                <Bell className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </button>
            </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic content area with L-shaped layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top area - splits when command center is open */}
          <div className={cn(
            "flex-1 flex overflow-hidden",
            isCommandCenterOpen ? "lg:pb-[150px]" : "" // Only add padding on desktop
          )}>
            {/* Main content - compresses when open */}
            <motion.div
              layout
              transition={layoutTransition}
              className={cn(
                "relative flex flex-col",
                isCommandCenterOpen 
                  ? "w-full lg:w-[65%]" // Full width on mobile, 65% on desktop
                  : "w-full"
              )}
            >
              <main className={cn(
                "flex-1 overflow-auto p-4 sm:p-6 lg:p-8",
                isCommandCenterOpen && "lg:block hidden" // Hide main content on mobile when command center is open
              )}>
                {children}
              </main>
            </motion.div>
            
            {/* Artifacts area - Full screen on mobile, slides in on desktop */}
            <AnimatePresence>
              {isCommandCenterOpen && (
                <>
                  {/* Mobile unified interface - shows both chat and artifacts */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-x-0 top-16 bottom-0 bg-white dark:bg-gray-900 z-50 lg:hidden overflow-hidden"
                  >
                    <div className="relative h-full flex flex-col">
                      {/* Header with smart context */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                          {currentContext ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                              <div className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                                  {currentContext.page}
                                </span>
                                {currentContext.selectedItem && !currentContext.selectedItem.includes('radix-') && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                                    - {currentContext.selectedItem}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <button
                          onClick={() => closeCommandCenter()}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Unified content area - shows artifacts/messages */}
                      <div className="flex-1 p-4 overflow-y-auto">
                        <ArtifactsPanel />
                      </div>
                      
                      {/* Chat input area */}
                      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
                        <div className="relative">
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask Aurelius..."
                            className="w-full h-20 px-3 py-2 pr-32 liquid-glass rounded-xl shadow-lg focus:outline-none focus:liquid-glass-accent focus:shadow-2xl transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                              }
                            }}
                            disabled={isProcessing}
                          />
                          {/* Integrated action buttons */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <button
                              onClick={() => {
                                // Voice input functionality
                                alert('Voice input coming soon!')
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              title="Voice input"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                // File attachment functionality
                                alert('File attachment coming soon!')
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              title="Attach file"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleSend}
                              disabled={!message.trim() || isProcessing}
                              className="p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              title="Send message"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Desktop artifacts - slides in from right */}
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "35%", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={layoutTransition}
                    className="hidden lg:flex flex-col relative border-l border-white/30 dark:border-gray-800/30 backdrop-blur-xl bg-white/60 dark:bg-gray-900/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="relative flex-1 p-4 overflow-hidden">
                      <ArtifactsPanel />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Overlay when command center is open on mobile */}
        <AnimatePresence>
          {isCommandCenterOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => closeCommandCenter()}
            />
          )}
        </AnimatePresence>
        
        {/* Desktop-only chat input area - split layout */}
        <AnimatePresence>
          {isCommandCenterOpen && (
            <motion.div
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              transition={layoutTransition}
              className="hidden lg:block absolute bottom-0 left-0 right-0 border-t border-white/30 dark:border-gray-800/30 backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              
              {/* Desktop layout - split layout */}
              <div className="relative">
                <div className="flex h-[150px]">
                  {/* Chat input area - 65% width (longer) */}
                  <div className="w-[65%] h-full">
                    <ChatInput 
                      message={message}
                      setMessage={setMessage}
                      isProcessing={isProcessing}
                      onSend={handleSend}
                    />
                  </div>
                  
                  {/* Action buttons area - 35% width centered under AI Assistant */}
                  <div className="w-[35%] h-full flex items-end justify-center pb-6">
                    <ChatActions 
                      message={message}
                      setMessage={setMessage}
                      isProcessing={isProcessing}
                      onSend={handleSend}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        <FAB />
      </div>
    </div>
  )
}