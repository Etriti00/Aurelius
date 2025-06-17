'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
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
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FAB } from '@/components/shared/FAB'
import { WebSocketIndicator } from '@/components/shared/WebSocketIndicator'
import { Brain3DLogo } from '@/components/shared/Brain3DLogo'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button 
            className="fixed inset-0 bg-black bg-opacity-25" 
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
            aria-label="Close mobile menu"
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:static lg:inset-0',
          'flex flex-col backdrop-blur-xl bg-white/95 border-r border-white/40 shadow-lg',
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/40">
          {!sidebarCollapsed ? (
            <Brain3DLogo size="sm" static={true} className="flex-nowrap" />
          ) : (
            <Brain3DLogo size="sm" static={true} showText={false} className="flex-nowrap" />
          )}
          
          {/* Collapse toggle - desktop only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
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
        <div className="border-t border-gray-200 p-4">
          <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'space-x-3')}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.email}
                </p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-3 justify-start text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="backdrop-blur-xl bg-white/90 border-b border-white/40 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Search bar */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search everything..."
                  className="w-full pl-10 pr-4 py-2 backdrop-blur-md bg-white/60 border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-white/60 focus:bg-white/80 transition-all duration-300 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-3">
              <WebSocketIndicator />
              
              <Button variant="ghost" size="sm" className="relative backdrop-blur-md bg-white/60 border border-white/30 hover:bg-white/80 transition-all duration-300">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </Button>

              <Button 
                size="sm" 
                className="backdrop-blur-xl bg-white/80 border border-white/40 text-gray-700 hover:bg-white/90 hover:text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Floating Action Button */}
      <FAB />
    </div>
  )
}