'use client'

import { useMemo } from 'react'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'

export function useResponsiveLayout() {
  const { isOpen: isCommandCenterOpen } = useAICommandCenter()
  
  // Memoize layout calculations for better performance
  const layout = useMemo(() => {
    if (isCommandCenterOpen) {
      return {
        // More compact spacing when compressed
        spacing: 'space-y-3 sm:space-y-4',
        padding: 'p-3 sm:p-4 lg:p-6',
        containerPadding: 'px-3 sm:px-4 lg:px-6 py-4 sm:py-6',
        cardPadding: 'p-3 sm:p-4',
        gridGap: 'gap-3 sm:gap-4',
        textSizes: {
          h1: 'text-xl sm:text-2xl lg:text-3xl',
          h2: 'text-lg sm:text-xl lg:text-2xl',
          h3: 'text-base sm:text-lg lg:text-xl',
          body: 'text-sm sm:text-base',
          small: 'text-xs sm:text-sm'
        }
      }
    }
    
    return {
      // Normal spacing when full width
      spacing: 'space-y-6 sm:space-y-8',
      padding: 'p-4 sm:p-6 lg:p-8',
      containerPadding: 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8',
      cardPadding: 'p-4 sm:p-6',
      gridGap: 'gap-4 sm:gap-6 lg:gap-8',
      textSizes: {
        h1: 'text-2xl sm:text-3xl lg:text-4xl',
        h2: 'text-xl sm:text-2xl lg:text-3xl',
        h3: 'text-lg sm:text-xl lg:text-2xl',
        body: 'text-base sm:text-lg',
        small: 'text-sm sm:text-base'
      }
    }
    
    return {
      // Normal spacing when full width
      spacing: 'space-y-6 sm:space-y-8',
      padding: 'p-4 sm:p-6 lg:p-8',
      containerPadding: 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8',
      cardPadding: 'p-4 sm:p-6',
      gridGap: 'gap-4 sm:gap-6 lg:gap-8',
      textSizes: {
        h1: 'text-2xl sm:text-3xl lg:text-4xl',
        h2: 'text-xl sm:text-2xl lg:text-3xl',
        h3: 'text-lg sm:text-xl lg:text-2xl',
        body: 'text-base sm:text-lg',
        small: 'text-sm sm:text-base'
      }
    }
  }, [isCommandCenterOpen])
  
  return {
    isCompressed: isCommandCenterOpen,
    ...layout,
    // Helper classes for common patterns
    gridCols: {
      cards: isCommandCenterOpen ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      main: isCommandCenterOpen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3',
      sidebar: isCommandCenterOpen ? 'lg:col-span-1' : 'lg:col-span-2'
    }
  }
}