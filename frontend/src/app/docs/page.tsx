'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Book, 
  Zap, 
  Puzzle, 
  MessageSquare, 
  ArrowRight,
  BookOpen,
  Code,
  Lightbulb,
  Play,
  Search,
  Users
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const quickStart = [
  {
    icon: Play,
    title: 'Getting Started',
    description: 'Set up your Aurelius account and connect your first integration in 5 minutes.',
    href: '/docs/getting-started'
  },
  {
    icon: Puzzle,
    title: 'Integrations Guide',
    description: 'Learn how to connect Gmail, Calendar, Slack, and 100+ other tools.',
    href: '/docs/integrations'
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Create powerful workflows that automate your daily tasks.',
    href: '/docs/workflows'
  },
  {
    icon: MessageSquare,
    title: 'AI Commands',
    description: 'Master natural language commands to get the most out of your AI assistant.',
    href: '/docs/ai-commands'
  }
]

const categories = [
  {
    icon: BookOpen,
    title: 'User Guide',
    description: 'Complete guides for using all Aurelius features',
    articles: 12,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Technical documentation for developers',
    articles: 8,
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: Puzzle,
    title: 'Integrations',
    description: 'Setup guides for all supported platforms',
    articles: 15,
    color: 'from-purple-500 to-violet-600'
  },
  {
    icon: Lightbulb,
    title: 'Best Practices',
    description: 'Tips and tricks from power users',
    articles: 6,
    color: 'from-amber-500 to-orange-600'
  },
  {
    icon: Zap,
    title: 'Automation',
    description: 'Advanced workflow and automation guides',
    articles: 10,
    color: 'from-cyan-500 to-blue-600'
  },
  {
    icon: Users,
    title: 'Team Features',
    description: 'Collaboration and team management',
    articles: 5,
    color: 'from-pink-500 to-rose-600'
  }
]

const popularArticles = [
  'How to set up Gmail integration',
  'Creating your first workflow',
  'Understanding AI learning patterns',
  'Calendar automation best practices',
  'Slack integration guide',
  'Mobile app features overview'
]

export default function DocsPage() {
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
              Aurelius
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Everything you need to master your AI assistant and automate your workflow.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Quick Start</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              New to Aurelius? Start here to get up and running quickly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {quickStart.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Link href={item.href}>
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <LiquidGlassIcon icon={item.icon} size="lg" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-semibold">
                            Read more
                            <ArrowRight className="ml-1 w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Categories */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Browse by Category</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Find exactly what you're looking for with our organized documentation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {categories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800">
                  <CardHeader>
                    <div className="mb-4">
                      <LiquidGlassIcon icon={category.icon} size="lg" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {category.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {category.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {category.articles} articles
                      </span>
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Popular Articles</h2>
              <div className="space-y-4">
                {popularArticles.map((article, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Book className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-gray-100">{article}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
                    Need Help?
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-400">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/contact">
                    <Button variant="primary" className="w-full">
                      Contact Support
                      <MessageSquare className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/community">
                    <Button variant="outline" className="w-full">
                      Join Community
                      <Users className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}