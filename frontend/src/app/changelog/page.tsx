'use client'

import { motion } from 'framer-motion'
import { Calendar, Star, Bug, Zap, Shield, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const releases = [
  {
    version: '2.1.0',
    date: '2024-12-15',
    type: 'major',
    title: 'Enhanced AI Learning & Cross-Platform Workflows',
    description: 'Major improvements to AI pattern recognition and new cross-platform automation capabilities.',
    changes: [
      {
        type: 'feature',
        icon: Zap,
        title: 'Advanced Pattern Recognition',
        description: 'AI now learns from 50% more data points for better task predictions'
      },
      {
        type: 'feature', 
        icon: Plus,
        title: 'Cross-Platform Workflows',
        description: 'Create workflows that span multiple applications and platforms'
      },
      {
        type: 'improvement',
        icon: Star,
        title: 'Faster Email Processing',
        description: '3x faster email categorization and response generation'
      },
      {
        type: 'fix',
        icon: Bug,
        title: 'Calendar Sync Issues',
        description: 'Resolved synchronization problems with Google Calendar recurring events'
      }
    ]
  },
  {
    version: '2.0.5',
    date: '2024-11-28',
    type: 'minor',
    title: 'Security Updates & Performance Improvements',
    description: 'Important security patches and performance optimizations.',
    changes: [
      {
        type: 'security',
        icon: Shield,
        title: 'Enhanced OAuth Security',
        description: 'Upgraded OAuth 2.0 implementation with additional security layers'
      },
      {
        type: 'improvement',
        icon: Star,
        title: 'Dashboard Loading Speed',
        description: 'Dashboard now loads 40% faster with optimized data fetching'
      },
      {
        type: 'fix',
        icon: Bug,
        title: 'Mobile App Crashes',
        description: 'Fixed crashes when handling large email threads on mobile devices'
      }
    ]
  },
  {
    version: '2.0.0',
    date: '2024-11-10',
    type: 'major',
    title: 'Aurelius 2.0 - Complete Platform Redesign',
    description: 'Complete overhaul with new AI engine, redesigned interface, and 50+ new integrations.',
    changes: [
      {
        type: 'feature',
        icon: Zap,
        title: 'New AI Engine',
        description: 'Powered by Claude-4 Sonnet for more accurate and context-aware responses'
      },
      {
        type: 'feature',
        icon: Plus,
        title: '50+ New Integrations',
        description: 'Added support for Notion, Figma, Linear, and many more productivity tools'
      },
      {
        type: 'improvement',
        icon: Star,
        title: 'Redesigned Interface',
        description: 'Modern, intuitive interface with improved accessibility and mobile support'
      },
      {
        type: 'feature',
        icon: Plus,
        title: 'Voice Commands',
        description: 'Natural language voice commands for hands-free productivity'
      }
    ]
  }
]

const getTypeColor = (type: string) => {
  switch (type) {
    case 'major':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
    case 'minor':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    case 'patch':
      return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
}

const getChangeTypeColor = (type: string) => {
  switch (type) {
    case 'feature':
      return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
    case 'improvement':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    case 'fix':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
    case 'security':
      return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
              Product
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                Changelog
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Stay up to date with new features, improvements, and fixes in Aurelius.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>Updated regularly with each release</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Changelog */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {releases.map((release, index) => (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader className="pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(release.type)}>
                          v{release.version}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(release.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-2xl text-gray-900 dark:text-gray-100 mb-2">
                      {release.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {release.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {release.changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                              <change.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-xs ${getChangeTypeColor(change.type)}`}>
                                {change.type}
                              </Badge>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                {change.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Subscribe to Updates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-20 text-center"
          >
            <Card className="max-w-lg mx-auto border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Stay Updated
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get notified when we release new features and improvements.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Follow our blog or sign up for product updates in your dashboard.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}