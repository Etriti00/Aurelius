'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Sparkles, Zap, Shield, Globe, Brain } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { useRef, Suspense } from 'react'
import { Brain3D } from './Brain3D'

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden bg-transparent granular-bg">
      {/* Apple-inspired gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/30" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-gradient-to-l from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
          {/* Left side - Content */}
          <motion.div
            style={{ y, opacity }}
            className="text-center lg:text-left lg:pr-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full liquid-glass-subtle mb-6 sm:mb-8"
            >
              <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">AI learns your style</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 ml-1.5 sm:ml-2" />
            </motion.div>

            {/* Main headline */}
            <div className="mb-6 sm:mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight"
              >
                <span className="block">Think different</span>
                <span className="block">about</span>
                <span className="block bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                  productivity
                </span>
              </motion.h1>
            </div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 sm:mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Aurelius is your AI chief of staff that understands your work style, 
              anticipates your needs, and executes tasks with the precision of human intuition.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 justify-center lg:justify-start"
            >
              <Link href="/signup">
                <Button variant="primary" size="lg" className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] px-6 sm:px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] px-6 sm:px-8">
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Watch demo
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                <span>Max secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <span>5,000+ AI actions</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                <span>100+ integrations</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - 3D Brain */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] mt-8 lg:mt-0"
          >
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-full animate-pulse" />
              </div>
            }>
              <Brain3D />
            </Suspense>
            
            {/* Floating insight cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute top-8 sm:top-16 -left-2 sm:-left-4 liquid-glass rounded-xl sm:rounded-2xl p-3 sm:p-4 max-w-[200px] sm:max-w-xs"
            >
              <div className="flex items-center gap-3">
                <LiquidGlassIcon icon={Sparkles} size="md" />
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">Pattern Recognition</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Learning your workflow</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
              className="absolute bottom-8 sm:bottom-16 -right-2 sm:-right-4 liquid-glass rounded-xl sm:rounded-2xl p-3 sm:p-4 max-w-[200px] sm:max-w-xs"
            >
              <div className="flex items-center gap-3">
                <LiquidGlassIcon icon={Zap} size="md" />
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">Neural Processing</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Executing 12 tasks</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}