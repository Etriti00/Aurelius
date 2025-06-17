'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Zap, Shield, Clock, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'

const integrationData: Record<string, {
  name: string
  description: string
  color: string
  features: string[]
  benefits: string[]
  logo: JSX.Element
}> = {
  gmail: {
    name: 'Gmail',
    description: 'Seamlessly integrate your Gmail inbox with Aurelius to manage emails, automate responses, and never miss important communications.',
    color: '#EA4335',
    features: [
      'Automatic email categorization and prioritization',
      'AI-powered response suggestions',
      'Smart scheduling from email threads',
      'Unified inbox across multiple accounts'
    ],
    benefits: [
      'Reduce email processing time by 70%',
      'Never miss important emails again',
      'Automate routine email tasks',
      'Seamless calendar integration'
    ],
    logo: (
      <svg viewBox="0 0 256 193" className="w-full h-full">
        <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z"/>
        <path fill="#34A853" d="M197.818 192.05h40.727c9.658 0 17.455-7.826 17.455-17.455V49.505l-27.507 15.572-30.675 28.063v98.91Z"/>
        <path fill="#EA4335" d="M197.818 17.455v75.683L256 49.504V26.181c0-21.69-24.64-34.118-41.89-21.69l-16.292 13.964Z"/>
        <path fill="#FBBC04" d="M0 49.504l58.182 43.634V17.455L41.89 4.492C24.61-7.937 0 4.492 0 26.18v23.324Z"/>
        <path fill="#C5221F" d="M58.182 93.138L128 144.772l69.818-51.634V17.455H58.182v75.683Z"/>
      </svg>
    )
  },
  slack: {
    name: 'Slack',
    description: 'Connect Slack to Aurelius for intelligent message management, automated workflows, and enhanced team collaboration.',
    color: '#4A154B',
    features: [
      'Smart message threading and organization',
      'Automated status updates and notifications',
      'AI-driven team insights and analytics',
      'Cross-platform message synchronization'
    ],
    benefits: [
      'Improve team response time by 50%',
      'Reduce notification overload',
      'Enhanced team productivity metrics',
      'Streamlined communication workflows'
    ],
    logo: (
      <svg viewBox="0 0 256 256" className="w-full h-full">
        <path fill="#E01E5A" d="M105.42 105.419c0-14.697-11.718-26.616-26.6-26.616-14.698 0-26.6 11.919-26.6 26.616 0 14.697 11.902 26.6 26.6 26.6h26.6v-26.6Z"/>
        <path fill="#36C5F0" d="M132.017 105.419c0-14.697 11.919-26.616 26.6-26.616 14.698 0 26.6 11.919 26.6 26.616v66.484c0 14.698-11.902 26.6-26.6 26.6-14.681 0-26.6-11.902-26.6-26.6v-66.484Z"/>
        <path fill="#2EB67D" d="M158.617 52.219c14.698 0 26.6-11.919 26.6-26.6C185.217 11.902 173.315.001 158.617.001c-14.681 0-26.6 11.901-26.6 26.618v26.6h26.6Z"/>
        <path fill="#ECB22E" d="M158.617 78.819c14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6H92.133c-14.698 0-26.6-11.902-26.6-26.6 0-14.681 11.902-26.6 26.6-26.6h66.484Z"/>
        <path fill="#E01E5A" d="M211.801 105.419c0 14.697-11.919 26.6-26.6 26.6-14.698 0-26.6-11.903-26.6-26.6s11.902-26.616 26.6-26.616c14.681 0 26.6 11.919 26.6 26.616Z"/>
        <path fill="#36C5F0" d="M185.201 78.819c0 14.697-11.902 26.6-26.6 26.6-14.681 0-26.6-11.903-26.6-26.6V12.335c0-14.698 11.919-26.6 26.6-26.6 14.698.001 26.6 11.902 26.6 26.6v66.484Z"/>
        <path fill="#2EB67D" d="M132.017 185.201c0-14.681 11.919-26.6 26.6-26.6 14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6h-26.6v-26.6Z"/>
        <path fill="#ECB22E" d="M105.42 211.801c0-14.681 11.902-26.6 26.6-26.6h66.484c14.698 0 26.6 11.919 26.6 26.6 0 14.698-11.902 26.6-26.6 26.6H132.02c-14.698-.001-26.6-11.902-26.6-26.6Z"/>
      </svg>
    )
  }
}

// Add default data for other integrations
const defaultIntegration = {
  name: 'Integration',
  description: 'Connect this powerful tool to Aurelius for enhanced productivity and seamless workflow automation.',
  color: '#6366f1',
  features: [
    'Intelligent data synchronization',
    'Automated workflow triggers',
    'Real-time collaboration features',
    'Advanced analytics and insights'
  ],
  benefits: [
    'Increase productivity by 60%',
    'Streamline your workflows',
    'Enhanced team collaboration',
    'Data-driven decision making'
  ],
  logo: (
    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
      AI
    </div>
  )
}

export default function IntegrationPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const integration = integrationData[slug] || { 
    ...defaultIntegration, 
    name: slug?.charAt(0).toUpperCase() + slug?.slice(1) || 'Integration'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 granular-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 liquid-glass-subtle border-b border-white/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8">
                {integration.logo}
              </div>
              <span className="font-semibold text-gray-900">{integration.name}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-24 h-24 mx-auto mb-8 liquid-glass rounded-3xl p-4"
            >
              {integration.logo}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6"
            >
              Connect{' '}
              <span 
                className="bg-clip-text text-transparent bg-gradient-to-r"
                style={{ 
                  backgroundImage: `linear-gradient(to right, ${integration.color}, ${integration.color}90)` 
                }}
              >
                {integration.name}
              </span>{' '}
              to Aurelius
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-600 mb-10 leading-relaxed"
            >
              {integration.description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full sm:w-auto"
                style={{ 
                  backgroundColor: integration.color,
                  borderColor: integration.color 
                }}
              >
                Connect {integration.name}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Documentation
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Features */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Powerful Features
                </h2>
                <div className="space-y-6">
                  {integration.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                      className="flex items-start space-x-4"
                    >
                      <LiquidGlassIcon 
                        icon={Check} 
                        size="sm" 
                      />
                      <p className="text-gray-700 leading-relaxed">{feature}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Key Benefits
                </h2>
                <div className="space-y-6">
                  {integration.benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                      className="liquid-glass rounded-2xl p-6"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <LiquidGlassIcon 
                          icon={[Zap, Shield, Clock, Users][index % 4]} 
                          size="sm"
                        />
                        <h3 className="font-semibold text-gray-900">
                          {benefit.split(' ').slice(0, 3).join(' ')}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {benefit}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="max-w-4xl mx-auto text-center liquid-glass rounded-3xl p-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to supercharge your productivity?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Connect {integration.name} to Aurelius in just a few clicks and experience the future of work.
            </p>
            <Button 
              variant="primary" 
              size="lg"
              style={{ 
                backgroundColor: integration.color,
                borderColor: integration.color 
              }}
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}