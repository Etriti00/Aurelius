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
        padding: 'p-2 sm:p-3 md:p-4 lg:p-6',
        containerPadding: 'px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6',
        cardPadding: 'p-3 sm:p-4',
        gridGap: 'gap-2 sm:gap-3 md:gap-4',
        textSizes: {
          h1: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
          h2: 'text-base sm:text-lg md:text-xl lg:text-2xl',
          h3: 'text-sm sm:text-base md:text-lg lg:text-xl',
          body: 'text-xs sm:text-sm md:text-base',
          small: 'text-xs sm:text-sm'
        },
        // Mobile-specific adjustments
        mobileAdjustments: {
          headerHeight: 'h-14 sm:h-16',
          sidebarWidth: 'w-16 sm:w-20 lg:w-64',
          fabSize: 'w-12 h-12 sm:w-14 sm:h-14',
          buttonSize: 'px-3 py-1.5 sm:px-4 sm:py-2'
        }
      }
    }
    
    return {
      // Normal spacing when full width
      spacing: 'space-y-4 sm:space-y-6 md:space-y-8',
      padding: 'p-3 sm:p-4 md:p-6 lg:p-8',
      containerPadding: 'px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8',
      cardPadding: 'p-3 sm:p-4 md:p-6',
      gridGap: 'gap-3 sm:gap-4 md:gap-6 lg:gap-8',
      textSizes: {
        h1: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
        h2: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
        h3: 'text-base sm:text-lg md:text-xl lg:text-2xl',
        body: 'text-sm sm:text-base md:text-lg',
        small: 'text-xs sm:text-sm md:text-base'
      },
      // Mobile-specific adjustments
      mobileAdjustments: {
        headerHeight: 'h-14 sm:h-16',
        sidebarWidth: 'w-20 sm:w-64',
        fabSize: 'w-14 h-14 sm:w-16 sm:h-16',
        buttonSize: 'px-4 py-2 sm:px-6 sm:py-3'
      }
    }
  }, [isCommandCenterOpen])
  
  return {
    isCompressed: isCommandCenterOpen,
    ...layout,
    // Helper classes for common patterns
    gridCols: {
      cards: isCommandCenterOpen 
        ? 'grid-cols-1 sm:grid-cols-2' 
        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      main: isCommandCenterOpen 
        ? 'grid-cols-1' 
        : 'grid-cols-1 lg:grid-cols-3 xl:grid-cols-4',
      sidebar: isCommandCenterOpen 
        ? 'col-span-1' 
        : 'col-span-1 lg:col-span-2 xl:col-span-3',
      widgets: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    }
  }
}