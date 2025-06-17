'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  ArrowRight, 
  Mail, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Brain, 
  Shield, 
  Smartphone,
  BarChart3,
  Bot,
  Workflow,
  Clock,
  Users,
  Target,
  Globe
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { ToolsCircle } from '@/components/shared/ToolsCircle'

const coreFeatures = [
  {
    icon: Mail,
    title: 'Smart Email Management',
    description: 'AI-powered email sorting, drafting, and automated responses that understand context and tone.',
    features: ['Auto-categorization', 'Smart replies', 'Priority inbox', 'Email templates'],
  },
  {
    icon: Calendar,
    title: 'Intelligent Scheduling',
    description: 'Let AI handle your calendar with smart scheduling, conflict resolution, and meeting optimization.',
    features: ['Auto-scheduling', 'Buffer time management', 'Meeting prep', 'Calendar insights'],
  },
  {
    icon: MessageSquare,
    title: 'Cross-Platform Communication',
    description: 'Unified communication across Slack, Teams, WhatsApp, and more with AI-assisted messaging.',
    features: ['Unified inbox', 'Smart notifications', 'Message summarization', 'Auto-routing'],
  },
  {
    icon: FileText,
    title: 'Document Intelligence',
    description: 'Automatically organize, summarize, and extract insights from your documents and files.',
    features: ['Auto-tagging', 'Content summarization', 'Smart search', 'Version control'],
  },
  {
    icon: Workflow,
    title: 'Custom Automations',
    description: 'Build powerful workflows that connect your favorite tools and automate complex processes.',
    features: ['Drag-drop builder', '100+ integrations', 'Conditional logic', 'API connections'],
  },
  {
    icon: Brain,
    title: 'AI Learning Engine',
    description: 'Continuously learns your preferences and work patterns to provide increasingly personalized assistance.',
    features: ['Pattern recognition', 'Preference learning', 'Adaptive suggestions', 'Performance insights'],
  },
]

const integrations = [
  { name: 'Gmail', category: 'Email' },
  { name: 'Outlook', category: 'Email' },
  { name: 'Slack', category: 'Communication' },
  { name: 'Microsoft Teams', category: 'Communication' },
  { name: 'Google Calendar', category: 'Calendar' },
  { name: 'Zoom', category: 'Video' },
  { name: 'Notion', category: 'Notes' },
  { name: 'Trello', category: 'Project Management' },
  { name: 'Asana', category: 'Project Management' },
  { name: 'Salesforce', category: 'CRM' },
  { name: 'HubSpot', category: 'CRM' },
  { name: 'GitHub', category: 'Development' },
]

const platforms = [
  {
    icon: Globe,
    title: 'Web Application',
    description: 'Full-featured web app accessible from any browser',
  },
  {
    icon: Smartphone,
    title: 'Mobile Apps',
    description: 'Native iOS and Android apps for on-the-go productivity',
  },
  {
    icon: Bot,
    title: 'API & Webhooks',
    description: 'Robust API for custom integrations and workflows',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliance, SSO, and enterprise-grade security',
  },
]

const stats = [
  { icon: Clock, label: 'Hours Saved Daily', value: '12,000+' },
  { icon: Users, label: 'Active Users', value: '50,000+' },
  { icon: Target, label: 'Tasks Automated', value: '2.4M+' },
  { icon: BarChart3, label: 'Productivity Increase', value: '40%' },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Powerful features for
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                intelligent productivity
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Discover how Aurelius transforms your daily workflow with AI that understands 
              your work style and anticipates your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Core Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to automate your workflow and focus on what matters most.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="liquid-glass rounded-3xl p-8 h-full transition-all duration-300 hover:shadow-lg border-0">
                  <div className="mb-6">
                    <LiquidGlassIcon icon={feature.icon} size="lg" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 bg-gray-50 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">100+ Integrations</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Connect all your favorite tools and let Aurelius work across your entire digital workplace.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            {/* Tools Circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex justify-center"
            >
              <div className="w-96 h-96">
                <ToolsCircle />
              </div>
            </motion.div>

            {/* Integration Categories */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                Works with your existing tools
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {['Email', 'Communication', 'Calendar', 'Project Management', 'CRM', 'Development'].map((category, index) => (
                  <div key={index} className="liquid-glass rounded-2xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{category}</h4>
                    <div className="space-y-1">
                      {integrations
                        .filter(integration => integration.category === category)
                        .slice(0, 2)
                        .map((integration, intIndex) => (
                          <div key={intIndex} className="text-sm text-gray-600">
                            {integration.name}
                          </div>
                        ))}
                      {integrations.filter(integration => integration.category === category).length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{integrations.filter(integration => integration.category === category).length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/integrations">
                <Button variant="outline" className="w-full mt-6">
                  View All Integrations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Available Everywhere</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Access your AI assistant across all your devices and platforms.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {platforms.map((platform, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center liquid-glass rounded-3xl p-8"
              >
                <div className="mb-6">
                  <LiquidGlassIcon icon={platform.icon} size="lg" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{platform.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{platform.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Proven Results</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of professionals who've transformed their productivity with Aurelius.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center liquid-glass rounded-3xl p-8"
              >
                <div className="mb-6">
                  <LiquidGlassIcon icon={stat.icon} size="lg" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to experience intelligent productivity?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Start your free trial today and discover how AI can transform your workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}