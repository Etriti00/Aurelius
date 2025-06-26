'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface LiquidGlassIconProps {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animate?: boolean
}

export function LiquidGlassIcon({ 
  icon: Icon, 
  size = 'md', 
  className = '',
  animate = true 
}: LiquidGlassIconProps) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { container: 'w-14 h-14', icon: 'w-7 h-7' },
    xl: { container: 'w-16 h-16', icon: 'w-8 h-8' }
  }

  const iconContainer = (
    <div className={`${sizes[size].container} relative rounded-2xl liquid-glass flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${className}`}>
      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent dark:from-gray-300/20 pointer-events-none" />
      
      {/* Icon */}
      <Icon className={`${sizes[size].icon} text-slate-700 dark:text-slate-300 relative z-10`} />
      
      {/* Floating particles */}
      <motion.div
        animate={animate ? { 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1 right-1 w-1 h-1 bg-white/60 dark:bg-gray-300/60 rounded-full"
      />
      <motion.div
        animate={animate ? { 
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.7, 0.4]
        } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white/50 dark:bg-gray-300/50 rounded-full"
      />
      
      {/* Ambient light */}
      <motion.div
        animate={animate ? { 
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.05, 1]
        } : {}}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute inset-0 bg-gradient-to-br from-slate-300/20 to-slate-500/20 dark:from-slate-600/20 dark:to-slate-400/20 rounded-2xl blur-sm -z-10"
      />
    </div>
  )

  if (animate) {
    return (
      <motion.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {iconContainer}
      </motion.div>
    )
  }

  return iconContainer
}