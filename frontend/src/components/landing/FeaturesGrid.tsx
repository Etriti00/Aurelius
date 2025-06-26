'use client'

import { motion } from 'framer-motion'
import { Brain, Zap, Link2, Users } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'

const features = [
  {
    title: 'Perfect Memory',
    subtitle: 'Remembers everything. Forever.',
    description: 'Every conversation, document, and interaction is indexed and instantly searchable with Claude-powered semantic understanding.',
    icon: Brain,
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    accent: 'text-blue-600',
    bgColor: 'from-blue-50/50 to-indigo-50/30',
    stats: '∞',
    statLabel: 'Context retention'
  },
  {
    title: 'Proactive Execution', 
    subtitle: 'Tasks complete themselves',
    description: 'AI that doesn\'t just suggest—it acts. From scheduling meetings to drafting responses, work happens automatically.',
    icon: Zap,
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    accent: 'text-amber-600',
    bgColor: 'from-amber-50/50 to-orange-50/30',
    stats: '5000+',
    statLabel: 'Actions per month'
  },
  {
    title: 'Deep Integration',
    subtitle: 'Works with everything you use',
    description: 'Native connections to Google Workspace, Microsoft 365, Slack, and 100+ other tools you rely on daily.',
    icon: Link2,
    color: 'bg-gradient-to-br from-emerald-500 to-green-600',
    accent: 'text-emerald-600',
    bgColor: 'from-emerald-50/50 to-green-50/30',
    stats: '100+',
    statLabel: 'Integrations'
  },
  {
    title: 'Strategic Intelligence',
    subtitle: 'Your AI chief of staff',
    description: 'Executive-level insights, meeting briefs, and strategic recommendations that help you stay ahead.',
    icon: Users,
    color: 'bg-gradient-to-br from-violet-500 to-purple-600',
    accent: 'text-violet-600',
    bgColor: 'from-violet-50/50 to-purple-50/30',
    stats: '24/7',
    statLabel: 'Always working'
  },
]

export function FeaturesGrid() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden granular-bg">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-r from-blue-100/40 to-indigo-100/40 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-l from-purple-100/40 to-violet-100/40 dark:from-purple-900/20 dark:to-violet-900/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 tracking-tight">
              Intelligence that
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                anticipates
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Built from the ground up to understand context, learn preferences, 
              and execute with the precision you'd expect from your best assistant.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="group"
            >
              <div className={`relative liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full hover:scale-[1.02] transition-all duration-500`}>
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                <div className="relative">
                  <div className="flex items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <LiquidGlassIcon 
                      icon={feature.icon} 
                      size="xl" 
                      className="flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className={`text-xs sm:text-sm font-semibold ${feature.accent} mb-3 sm:mb-4`}>
                        {feature.subtitle}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{feature.stats}</span>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{feature.statLabel}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}