'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRef, useEffect } from 'react'

interface BrainLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function BrainLogo({ className = '', size = 'md', showText = true }: BrainLogoProps) {
  const brainRef = useRef<HTMLDivElement>(null)

  const sizes = {
    sm: { container: 'w-8 h-8', brain: 'w-6 h-6', text: 'text-lg' },
    md: { container: 'w-10 h-10', brain: 'w-8 h-8', text: 'text-xl' },
    lg: { container: 'w-12 h-12', brain: 'w-10 h-10', text: 'text-2xl' }
  }

  useEffect(() => {
    if (!brainRef.current) return

    let rotation = 0
    const particles: HTMLElement[] = []

    // Create neural particles
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div')
      particle.className = 'absolute w-1 h-1 bg-white/60 rounded-full'
      particle.style.left = '50%'
      particle.style.top = '50%'
      brainRef.current.appendChild(particle)
      particles.push(particle)
    }

    const animate = () => {
      rotation += 1
      
      if (brainRef.current) {
        // Rotate brain with subtle 3D effect
        brainRef.current.style.transform = `
          perspective(200px) 
          rotateY(${rotation * 0.5}deg) 
          rotateX(${Math.sin(rotation * 0.01) * 5}deg)
        `

        // Animate particles in neural network pattern
        particles.forEach((particle, index) => {
          const angle = (rotation * 2 + index * 45) * (Math.PI / 180)
          const radius = 12 + Math.sin(rotation * 0.02 + index) * 3
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          
          particle.style.transform = `translate(${x}px, ${y}px)`
          particle.style.opacity = `${0.3 + Math.sin(rotation * 0.03 + index) * 0.3}`
        })
      }

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      particles.forEach(particle => particle.remove())
    }
  }, [])

  return (
    <Link href="/" className={`flex items-center space-x-3 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        className="relative"
      >
        {/* Liquid glass container */}
        <div className={`${sizes[size].container} relative rounded-2xl liquid-glass overflow-hidden`}>
          {/* Brain container with 3D rotation */}
          <div 
            ref={brainRef}
            className={`${sizes[size].brain} relative mx-auto mt-1 preserve-3d`}
          >
            {/* Brain shape using CSS */}
            <div className="relative w-full h-full">
              {/* Left hemisphere */}
              <div className="absolute left-0 top-0 w-1/2 h-full bg-gradient-to-br from-slate-600 to-slate-700 rounded-full opacity-90" />
              {/* Right hemisphere */}
              <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-bl from-slate-700 to-slate-800 rounded-full opacity-90" />
              {/* Central connection */}
              <div className="absolute left-1/2 top-1/2 w-0.5 h-3/4 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" />
              {/* Neural pathways */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-2 h-0.5 bg-slate-500 rounded transform rotate-45" />
                <div className="absolute top-3/4 right-1/4 w-2 h-0.5 bg-slate-500 rounded transform -rotate-45" />
                <div className="absolute top-1/2 left-1/3 w-1.5 h-0.5 bg-slate-500 rounded" />
              </div>
            </div>
          </div>
          
          {/* Ambient glow */}
          <motion.div
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-slate-400/20 to-slate-600/20 rounded-2xl blur-sm"
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