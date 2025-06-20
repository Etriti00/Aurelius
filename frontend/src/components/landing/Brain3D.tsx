'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

function AnimatedParticle({ 
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
      className="absolute w-1.5 h-1.5 rounded-full opacity-70"
      style={{
        background: 'linear-gradient(45deg, #3B82F6, #8B5CF6, #06B6D4)',
        boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)',
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

function NeuronConnection({ startAngle, endAngle, radius }: { startAngle: number, endAngle: number, radius: number }) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: radius * 2,
        height: radius * 2,
      }}
    >
      <svg width="100%" height="100%" className="absolute inset-0">
        <motion.path
          d={`M ${radius + radius * Math.cos(startAngle)} ${radius + radius * Math.sin(startAngle)} 
              Q ${radius} ${radius} 
              ${radius + radius * Math.cos(endAngle)} ${radius + radius * Math.sin(endAngle)}`}
          stroke="url(#neuronGradient)"
          strokeWidth="0.5"
          fill="none"
          opacity={0.4}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
        <defs>
          <linearGradient id="neuronGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

export function Brain3D() {
  const brainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const brain = brainRef.current
    if (!brain) return

    let rotation = 0
    const animate = () => {
      rotation += 0.3
      brain.style.transform = `
        perspective(1000px) 
        rotateY(${rotation}deg) 
        rotateX(${Math.sin(rotation * 0.008) * 15}deg)
        rotateZ(${Math.cos(rotation * 0.006) * 5}deg)
      `
      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  // Enhanced particle system with varied angles
  const particles = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    delay: i * 0.15,
    duration: 6 + Math.random() * 3,
    radius: 60 + Math.random() * 100,
    angle: (i / 32) * Math.PI * 2,
  }))

  // Neural connections
  const connections = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    startAngle: (i / 8) * Math.PI * 2,
    endAngle: ((i + 3) / 8) * Math.PI * 2,
    radius: 80 + i * 10,
  }))

  return (
    <div className="w-full h-full flex items-center justify-center relative perspective-1000">
      {/* Neural connections background */}
      <div className="absolute inset-0">
        {connections.map((connection) => (
          <NeuronConnection
            key={connection.id}
            startAngle={connection.startAngle}
            endAngle={connection.endAngle}
            radius={connection.radius}
          />
        ))}
      </div>

      {/* Central brain complex */}
      <motion.div
        ref={brainRef}
        className="relative preserve-3d"
        animate={{
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Brain core with enhanced depth */}
        <div className="relative w-40 h-40">
          {/* Outer shell */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-full shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-full" />
          </div>
          
          {/* Middle layer */}
          <div className="absolute inset-3 bg-gradient-to-br from-blue-400/80 via-purple-500/80 to-indigo-600/80 rounded-full blur-[1px]" />
          
          {/* Inner core */}
          <div className="absolute inset-6 bg-gradient-to-br from-cyan-400/60 to-blue-500/60 rounded-full" />
          
          {/* Neural activity center */}
          <motion.div
            className="absolute inset-12 bg-white/40 rounded-full backdrop-blur-sm"
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

          {/* Surface neural patterns */}
          <div className="absolute inset-2 rounded-full overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
                style={{
                  top: `${20 + i * 12}%`,
                  transform: `rotate(${i * 30}deg)`,
                }}
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>

        {/* Enhanced orbiting rings with depth */}
        <motion.div
          className="absolute inset-0 border-2 border-blue-400/40 rounded-full shadow-lg"
          style={{ 
            width: '240px', 
            height: '240px', 
            left: '-50px', 
            top: '-50px',
            filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute inset-0 border border-purple-400/30 rounded-full"
          style={{ 
            width: '290px', 
            height: '290px', 
            left: '-75px', 
            top: '-75px',
            filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.2))'
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute inset-0 border border-cyan-400/20 rounded-full"
          style={{ 
            width: '340px', 
            height: '340px', 
            left: '-100px', 
            top: '-100px',
            filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.15))'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Enhanced particle system */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <AnimatedParticle
            key={particle.id}
            delay={particle.delay}
            duration={particle.duration}
            radius={particle.radius}
            angle={particle.angle}
          />
        ))}
      </div>

      {/* Ambient energy fields */}
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={`energy-${i}`}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${
              i % 3 === 0 ? '#3B82F6' : i % 3 === 1 ? '#8B5CF6' : '#06B6D4'
            }, transparent)`,
            left: `${45 + Math.random() * 10}%`,
            top: `${45 + Math.random() * 10}%`,
          }}
          animate={{
            x: [0, Math.random() * 300 - 150],
            y: [0, Math.random() * 300 - 150],
            opacity: [0, 0.7, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}