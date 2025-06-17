'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Link2, Brain, Rocket, ArrowRight, Sparkles } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { ToolsCircle } from '@/components/shared/ToolsCircle'

const steps = [
  {
    number: '01',
    title: 'Connect your tools',
    description: 'Link Gmail, Calendar, Slack, and your favorite apps in seconds. One-click OAuth, no complex setup.',
    icon: Link2,
    visual: <ToolsCircle />,
  },
  {
    number: '02',
    title: 'AI learns your style',
    description: 'Aurelius observes your work patterns, understands your priorities, and adapts to your unique workflow.',
    icon: Brain,
    visual: (
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full blur-3xl"
        />
        <Brain className="w-32 h-32 text-purple-600 relative z-10" />
      </div>
    ),
  },
  {
    number: '03',
    title: 'Watch magic happen',
    description: 'Tasks complete automatically. Meetings get scheduled. Emails draft themselves. You focus on what matters.',
    icon: Rocket,
    visual: (
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Rocket className="w-32 h-32 text-orange-600 rotate-45" />
        </motion.div>
        <motion.div
          animate={{ scale: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-full h-full border-4 border-orange-300 rounded-full" />
        </motion.div>
      </div>
    ),
  },
]

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const x = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <section ref={containerRef} className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden granular-bg">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          style={{ x }}
          className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16 lg:mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.6 }}
            className="mb-6"
          >
            <LiquidGlassIcon icon={Sparkles} size="xl" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Up and running in
            <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
              3 simple steps
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
            No consultants. No training. Just connect your tools and let Aurelius 
            start working. Most users see their first automated task within 5 minutes.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="mb-16 sm:mb-20 lg:mb-24 last:mb-0"
            >
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}>
                {/* Content */}
                <div className={`text-center lg:text-left ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <motion.div
                    whileHover={{ x: index % 2 === 1 ? -8 : 8 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="space-y-4 sm:space-y-6"
                  >
                    <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4">
                      <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-200">
                        {step.number}
                      </span>
                      <LiquidGlassIcon icon={step.icon} size="xl" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                    <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-md mx-auto lg:mx-0">
                      {step.description}
                    </p>
                  </motion.div>
                </div>

                {/* Visual */}
                <div className={`flex justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative w-full max-w-md aspect-square rounded-2xl sm:rounded-3xl liquid-glass-accent p-6 sm:p-8 overflow-hidden"
                  >
                    {step.visual}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-12 sm:mt-16 lg:mt-20"
        >
          <div className="inline-flex flex-col items-center">
            <p className="text-lg text-gray-600 mb-8">
              Join 10,000+ professionals already using Aurelius
            </p>
            <Link href="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="primary" size="lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Professional AI productivity starts here
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}