'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Cookie helpers
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 365) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from cookie or system preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const savedTheme = getCookie('theme') as Theme | null
    // If saved theme is system or null, use system preference to determine light/dark
    let initialTheme: Theme = 'light'
    
    if (savedTheme === 'light' || savedTheme === 'dark') {
      initialTheme = savedTheme
    } else {
      // Default to system preference but store as light/dark
      initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    setThemeState(initialTheme)
    setMounted(true)
    
    // Apply initial theme immediately to prevent flash
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (currentTheme: Theme) => {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    
    // Since we only have light/dark now, currentTheme should be one of those
    const actualTheme = currentTheme === 'dark' ? 'dark' : 'light'
    
    root.classList.add(actualTheme)
    setResolvedTheme(actualTheme)
    return actualTheme
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    setCookie('theme', newTheme)
    applyTheme(newTheme)
  }

  // Apply theme when it changes
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  // No need to listen for system changes since we only use light/dark

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  
  if (!context) {
    // Return default values instead of throwing during hydration/navigation
    return {
      theme: 'light' as Theme,
      setTheme: () => {},
      resolvedTheme: 'light' as 'light' | 'dark',
      mounted: false
    }
  }

  return context
}