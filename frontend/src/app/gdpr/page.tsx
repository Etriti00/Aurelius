'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Shield, 
  Download, 
  Trash2, 
  Edit, 
  Eye, 
  Clock,
  CheckCircle,
  FileText,
  Users,
  Lock,
  Globe,
  Mail
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const gdprRights = [
  {
    icon: Eye,
    title: 'Right to Access',
    description: 'You have the right to know what personal data we process about you.',
    actions: ['Request a copy of your data', 'See how your data is used', 'Know who has access']
  },
  {
    icon: Edit,
    title: 'Right to Rectification',
    description: 'You can request corrections to inaccurate or incomplete personal data.',
    actions: ['Update incorrect information', 'Complete missing data', 'Correct outdated details']
  },
  {
    icon: Trash2,
    title: 'Right to Erasure',
    description: 'Request deletion of your personal data under certain conditions.',
    actions: ['Delete your account', 'Remove specific data', 'Exercise "right to be forgotten"']
  },
  {
    icon: Download,
    title: 'Right to Portability',
    description: 'Receive your personal data in a structured, machine-readable format.',
    actions: ['Export your data', 'Transfer to another service', 'Machine-readable format']
  },
  {
    icon: Clock,
    title: 'Right to Restriction',
    description: 'Limit the processing of your personal data under certain circumstances.',
    actions: ['Pause data processing', 'Limit use of data', 'Temporary restrictions']
  },
  {
    icon: Shield,
    title: 'Right to Object',
    description: 'Object to the processing of your personal data for specific purposes.',
    actions: ['Opt out of processing', 'Object to marketing', 'Refuse automated decisions']
  }
]

const dataCategories = [
  {
    category: 'Account Information',
    description: 'Basic account details and preferences',
    examples: ['Email address', 'Name', 'Account settings', 'Subscription details'],
    retention: '2 years after account closure',
    lawfulBasis: 'Contract performance'
  },
  {
    category: 'Usage Analytics',
    description: 'How you interact with our service',
    examples: ['Feature usage', 'Login times', 'Performance metrics', 'Error logs'],
    retention: '18 months',
    lawfulBasis: 'Legitimate interest'
  },
  {
    category: 'Integration Metadata',
    description: 'Information from connected services',
    examples: ['Email headers', 'Calendar events', 'Contact lists', 'Document titles'],
    retention: 'User-configurable (default: 1 year)',
    lawfulBasis: 'Contract performance'
  },
  {
    category: 'AI Processing Data',
    description: 'Data used for AI model improvements',
    examples: ['Anonymized patterns', 'Aggregated insights', 'Performance metrics'],
    retention: 'Indefinitely (anonymized)',
    lawfulBasis: 'Legitimate interest'
  }
]

const processingPurposes = [
  'Providing and maintaining our AI assistant service',
  'Processing your requests and commands',
  'Improving our AI models and algorithms',
  'Sending service-related communications',
  'Ensuring security and preventing fraud',
  'Complying with legal obligations'
]

export default function GDPRPage() {
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
              GDPR
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                Compliance & Your Rights
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Understanding your data protection rights under the General Data Protection Regulation and how Aurelius ensures compliance.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>EU Regulation Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Full Data Rights</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-500" />
                <span>Privacy by Design</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Your GDPR Rights */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Your GDPR Rights</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Under GDPR, you have comprehensive rights over your personal data. Here's how you can exercise them.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {gdprRights.map((right, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader>
                    <div className="mb-4">
                      <LiquidGlassIcon icon={right.icon} size="lg" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {right.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {right.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {right.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
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
            <Card className="max-w-lg mx-auto border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Exercise Your Rights
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Contact our Data Protection Officer to exercise any of your GDPR rights.
                </p>
                <Link href="mailto:dpo@aurelius.ai">
                  <Button variant="primary" className="w-full">
                    Contact DPO
                    <Mail className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Data We Process */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Data We Process</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Transparent information about what data we collect, why we process it, and how long we keep it.
            </p>
          </motion.div>

          <div className="space-y-8 max-w-6xl mx-auto">
            {dataCategories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardContent className="p-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                          {category.category}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          {category.description}
                        </p>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Examples include:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {category.examples.map((example, exampleIndex) => (
                              <div key={exampleIndex} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                {example}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Retention Period</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            {category.retention}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Lawful Basis</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            {category.lawfulBasis}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Processing Purposes */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Why We Process Your Data
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                We only process your personal data for specific, legitimate purposes outlined below.
              </p>
              <div className="space-y-4">
                {processingPurposes.map((purpose, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-gray-100">{purpose}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                    <Users className="w-5 h-5" />
                    Data Protection Officer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Our DPO oversees all data protection activities and is your point of contact for GDPR matters.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> dpo@aurelius.ai</p>
                    <p><strong>Response time:</strong> Within 30 days</p>
                    <p><strong>Languages:</strong> English, German, French</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                    <FileText className="w-5 h-5" />
                    Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/privacy" className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-gray-100">Privacy Policy</span>
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                    <Link href="/terms" className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-gray-100">Terms of Service</span>
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                    <Link href="/security" className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-gray-100">Security Overview</span>
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Questions About Your Data Rights?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Our Data Protection Officer is here to help you understand and exercise your GDPR rights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="mailto:dpo@aurelius.ai">
                <Button variant="primary" size="lg">
                  Contact DPO
                  <Mail className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/support">
                <Button variant="outline" size="lg">
                  General Support
                  <Users className="ml-2 h-5 w-5" />
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