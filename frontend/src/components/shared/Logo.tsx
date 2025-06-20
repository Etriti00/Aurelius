'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl' }
  }

  return (
    <Link href="/" className={`flex items-center space-x-3 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        {/* Liquid glass container */}
        <div className={`${sizes[size].icon} relative rounded-2xl bg-gradient-to-br from-white/90 via-white/60 to-white/30 backdrop-blur-xl border border-white/40 shadow-2xl shadow-gray-400/20 overflow-hidden`}>
          {/* Inner liquid glass effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-50/20 to-amber-50/30 rounded-2xl" />
          
          {/* Aurelius 'A' symbol */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <motion.div
              animate={{ 
                background: [
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-800 via-gray-600 to-gray-800"
              style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '18px' : '20px' }}
            >
              A
            </motion.div>
          </div>
          
          {/* Floating particles */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1 right-1 w-1 h-1 bg-white/60 rounded-full"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white/50 rounded-full"
          />
        </div>
      </motion.div>
      
      {showText && (
        <motion.span 
          whileHover={{ x: 2 }}
          className={`${sizes[size].text} font-bold text-gray-900 tracking-tight`}
        >
          Aurelius
        </motion.span>
      )}
    </Link>
  )
}