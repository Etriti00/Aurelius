'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface BrainIconProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  static?: boolean
  colors?: {
    primary: string
    secondary: string
    tertiary: string
    ring: string
  }
}

function BrainAnimatedParticle({ 
  delay, 
  duration, 
  radius, 
  angle 
}: { 
  delay: number
  duration: number
  radius: number
  angle: number 
}) {
  return (
    <motion.div
      className="absolute w-0.5 h-0.5 rounded-full opacity-60"
      style={{
        background: 'linear-gradient(45deg, #3B82F6, #8B5CF6, #06B6D4)',
        boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
      animate={{
        x: [
          0, 
          radius * Math.cos(angle), 
          radius * Math.cos(angle + Math.PI), 
          radius * Math.cos(angle + 2 * Math.PI), 
          0
        ],
        y: [
          0, 
          radius * Math.sin(angle) * 0.6, 
          radius * Math.sin(angle + Math.PI) * 0.6, 
          radius * Math.sin(angle + 2 * Math.PI) * 0.6, 
          0
        ],
        scale: [0.3, 1, 0.6, 1, 0.3],
        opacity: [0.3, 0.8, 0.4, 0.8, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

export function BrainIcon({ 
  className = '', 
  size = 'md', 
  static: isStatic = false,
  colors = {
    primary: 'from-blue-500 via-indigo-600 to-purple-700',
    secondary: 'from-cyan-400/60 to-blue-500/60',
    tertiary: 'bg-white/40',
    ring: 'border-blue-400/50'
  }
}: BrainIconProps) {
  const brainRef = useRef<HTMLDivElement>(null)

  const sizes = {
    sm: { 
      container: 'w-8 h-8', 
      brain: 'w-6 h-6', 
      particles: 8,
      radius: 8,
      ringSize: 35
    },
    md: { 
      container: 'w-10 h-10', 
      brain: 'w-8 h-8', 
      particles: 12,
      radius: 12,
      ringSize: 45
    },
    lg: { 
      container: 'w-12 h-12', 
      brain: 'w-10 h-10', 
      particles: 16,
      radius: 16,
      ringSize: 55
    }
  }

  const sizeConfig = sizes[size]

  useEffect(() => {
    const brain = brainRef.current
    if (!brain || isStatic) return

    let rotation = 0
    const animate = () => {
      rotation += 0.5
      brain.style.transform = `
        perspective(200px) 
        rotateY(${rotation}deg) 
        rotateX(${Math.sin(rotation * 0.01) * 10}deg)
        rotateZ(${Math.cos(rotation * 0.008) * 3}deg)
      `
      requestAnimationFrame(animate)
    }
    animate()
  }, [isStatic])

  // Compact particle system
  const particles = Array.from({ length: sizeConfig.particles }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    duration: 4 + Math.random() * 2,
    radius: sizeConfig.radius + Math.random() * 8,
    angle: (i / sizeConfig.particles) * Math.PI * 2,
  }))

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeConfig.container} relative flex items-center justify-center perspective-1000`}>
        {/* Central brain core */}
        <motion.div
          ref={brainRef}
          className="relative preserve-3d"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Brain core */}
          <div className={`relative ${sizeConfig.brain}`}>
            {/* Outer shell */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.primary} rounded-full shadow-lg`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-full" />
            </div>
            
            {/* Inner core */}
            <div className={`absolute inset-1 bg-gradient-to-br ${colors.secondary} rounded-full`} />
            
            {/* Neural activity center */}
            <motion.div
              className={`absolute inset-2 ${colors.tertiary} rounded-full backdrop-blur-sm`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Orbiting ring */}
          <motion.div
            className={`absolute inset-0 border ${colors.ring} rounded-full`}
            style={{ 
              width: `${sizeConfig.ringSize}px`, 
              height: `${sizeConfig.ringSize}px`, 
              left: `${-(sizeConfig.ringSize - parseInt(sizeConfig.brain.split('-')[1]) * 4) / 2}px`, 
              top: `${-(sizeConfig.ringSize - parseInt(sizeConfig.brain.split('-')[1]) * 4) / 2}px`,
              filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))'
            }}
            animate={isStatic ? {} : { rotate: 360 }}
            transition={isStatic ? {} : { duration: 12, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Compact particle system */}
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <BrainAnimatedParticle
              key={particle.id}
              delay={particle.delay}
              duration={particle.duration}
              radius={particle.radius}
              angle={particle.angle}
            />
          ))}
        </div>
      </div>
    </div>
  )
}