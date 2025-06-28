'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  variant?: 'default' | 'minimal' | 'dashboard'
  className?: string
}

export function ThemeToggle({ variant = 'default', className = '' }: ThemeToggleProps) {
  let theme: 'light' | 'dark' = 'light'
  let setTheme: (theme: 'light' | 'dark') => void = () => {}
  let mounted: boolean = false
  
  try {
    const themeData = useTheme()
    theme = themeData.theme
    setTheme = themeData.setTheme
    mounted = themeData.mounted
  } catch (error) {
    console.warn('ThemeToggle: Error accessing theme context, using defaults', error)
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`w-9 h-9 ${className}`}
        disabled
      >
        <Sun className="w-4 h-4" />
      </Button>
    )
  }

  const cycleTheme = () => {
    // Toggle between light and dark only
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={cycleTheme}
        className={`p-2 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-all duration-200 backdrop-blur-sm ${className}`}
        title={`Theme: ${theme === 'light' ? 'Light' : 'Dark'}. Click to switch.`}
      >
        {theme === 'light' ? (
          <Sun className="w-4 h-4 text-yellow-600" />
        ) : (
          <Moon className="w-4 h-4 text-blue-400" />
        )}
      </button>
    )
  }

  if (variant === 'dashboard') {
    return (
      <button
        onClick={cycleTheme}
        className={`p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg shadow-black/25 dark:shadow-white/25 hover:bg-gray-900 dark:hover:bg-gray-100 hover:shadow-xl hover:shadow-black/30 dark:hover:shadow-white/30 hover:scale-[1.02] transition-all duration-200 ${className}`}
        title={`Theme: ${theme === 'light' ? 'Light' : 'Dark'}. Click to switch.`}
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-yellow-600" />
        ) : (
          <Moon className="w-5 h-5 text-blue-400" />
        )}
      </button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className={`w-9 h-9 ${className}`}
      title={`Current theme: ${theme}. Click to cycle through themes.`}
    >
      {theme === 'light' ? (
        <Sun className="w-4 h-4 text-yellow-600" />
      ) : (
        <Moon className="w-4 h-4 text-blue-400" />
      )}
    </Button>
  )
}