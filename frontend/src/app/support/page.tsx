'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MessageSquare, 
  Mail, 
  Book, 
  Users, 
  ArrowRight,
  HelpCircle,
  Clock,
  CheckCircle,
  Search,
  Phone,
  Video,
  FileText
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const supportOptions = [
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Get instant help from our support team during business hours.',
    availability: 'Mon-Fri, 9 AM - 6 PM EST',
    responseTime: 'Usually < 2 minutes',
    action: 'Start Chat',
    recommended: true,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Send us detailed questions and get comprehensive responses.',
    availability: '24/7',
    responseTime: 'Usually < 4 hours',
    action: 'Send Email',
    href: 'mailto:support@aurelius.ai',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Speak directly with our technical experts for complex issues.',
    availability: 'Mon-Fri, 10 AM - 5 PM EST',
    responseTime: 'Scheduled calls',
    action: 'Schedule Call',
    planRequired: 'Pro & Teams plans',
    color: 'from-purple-500 to-violet-600'
  },
  {
    icon: Video,
    title: 'Screen Share',
    description: 'Get hands-on help with setup and troubleshooting.',
    availability: 'By appointment',
    responseTime: 'Same day booking',
    action: 'Book Session',
    planRequired: 'Teams plan',
    color: 'from-amber-500 to-orange-600'
  }
]

const quickHelp = [
  {
    icon: Book,
    title: 'Documentation',
    description: 'Comprehensive guides and tutorials',
    href: '/docs'
  },
  {
    icon: Users,
    title: 'Community Forum',
    description: 'Get help from other users',
    href: '/community'
  },
  {
    icon: Video,
    title: 'Video Tutorials',
    description: 'Step-by-step video guides',
    href: '/docs/videos'
  },
  {
    icon: FileText,
    title: 'Status Page',
    description: 'Check system status and uptime',
    href: 'https://status.aurelius.ai'
  }
]

const faqs = [
  {
    question: 'How do I connect my Gmail account?',
    answer: 'Go to Settings > Integrations, click on Gmail, and follow the OAuth flow. Make sure to grant all required permissions for full functionality.'
  },
  {
    question: 'Why isn\'t my AI assistant learning my preferences?',
    answer: 'The AI needs at least 7 days and 50+ interactions to start recognizing patterns. Make sure to use natural language commands and provide feedback on suggestions.'
  },
  {
    question: 'Can I use Aurelius on multiple devices?',
    answer: 'Yes! Your account syncs across all devices. Download our mobile apps or access the web version from any browser.'
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'Go to Settings > Billing and click "Cancel Subscription". You\'ll retain access until the end of your current billing period.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use Max-grade encryption, SOC 2 compliance, and never store your actual email content - only metadata and summaries.'
  },
  {
    question: 'How many integrations can I connect?',
    answer: 'Pro plans include 4 integrations, Max plans include unlimited integrations, and Teams plans include unlimited integrations per user.'
  }
]

export default function SupportPage() {
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
              We're here to
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                help you succeed
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Get the support you need to make the most of your AI assistant. Our team is standing by.
            </p>
            
            {/* Quick Search */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Usually respond in &lt; 2 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>99.9% satisfaction rate</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Choose Your Support Channel</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Pick the support method that works best for your situation and urgency level.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {supportOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className={`h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white dark:bg-gray-800 ${option.recommended ? 'ring-2 ring-blue-500' : ''}`}>
                  {option.recommended && (
                    <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-b-lg text-center">
                      Recommended
                    </div>
                  )}
                  <CardHeader>
                    <div className="mb-4">
                      <LiquidGlassIcon icon={option.icon} size="lg" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {option.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {option.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Availability:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{option.availability}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Response time:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{option.responseTime}</span>
                      </div>
                      {option.planRequired && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Plan required:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">{option.planRequired}</span>
                        </div>
                      )}
                    </div>
                    <Link href={option.href || '#'}>
                      <Button variant={option.recommended ? "primary" : "outline"} className="w-full">
                        {option.action}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Help */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Quick Help Resources</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Often, you can find the answer you're looking for right away.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {quickHelp.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Link href={item.href}>
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800">
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        <LiquidGlassIcon icon={item.icon} size="lg" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Common questions and answers to help you get started quickly.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-blue-500 mt-1" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mt-12"
          >
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Can't find what you're looking for?
            </p>
            <Link href="/contact">
              <Button variant="primary">
                Contact Support
                <MessageSquare className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}