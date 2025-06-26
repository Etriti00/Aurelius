'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Lock, 
  Eye, 
  Server, 
  FileKey,
  UserCheck,
  Globe,
  Award,
  CheckCircle,
  Clock,
  Building,
  AlertTriangle
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data is encrypted using AES-256 encryption both in transit and at rest.',
    details: 'TLS 1.3 for data in transit, AES-256-GCM for data at rest'
  },
  {
    icon: UserCheck,
    title: 'Zero Trust Architecture',
    description: 'Every request is verified and authenticated, regardless of location or device.',
    details: 'Multi-factor authentication, device verification, and continuous monitoring'
  },
  {
    icon: Eye,
    title: 'Privacy by Design',
    description: 'We process only metadata and summaries, never your actual email content.',
    details: 'Content processing happens locally, only insights are stored'
  },
  {
    icon: Server,
    title: 'SOC 2 Type II Compliant',
    description: 'Independently audited security controls and data protection practices.',
    details: 'Annual audits by certified third-party security firms'
  },
  {
    icon: FileKey,
    title: 'Data Minimization',
    description: 'We collect and store only the minimum data required for functionality.',
    details: 'Automatic data purging, configurable retention policies'
  },
  {
    icon: Globe,
    title: 'Global Compliance',
    description: 'GDPR, CCPA, HIPAA, and other regional privacy regulations compliant.',
    details: 'Regular compliance audits and legal review processes'
  }
]

const certifications = [
  {
    name: 'SOC 2 Type II',
    description: 'Security, availability, and confidentiality',
    status: 'Current',
    date: '2024'
  },
  {
    name: 'GDPR Compliant',
    description: 'European data protection standards',
    status: 'Current',
    date: '2024'
  },
  {
    name: 'CCPA Compliant',
    description: 'California privacy protection',
    status: 'Current',
    date: '2024'
  },
  {
    name: 'ISO 27001',
    description: 'Information security management',
    status: 'In Progress',
    date: '2025'
  }
]

const infrastructure = [
  {
    title: 'Cloud Infrastructure',
    provider: 'AWS & Google Cloud',
    description: 'Max-grade cloud infrastructure with 99.99% uptime SLA',
    features: ['Multi-region deployment', 'Auto-scaling', 'DDoS protection', 'WAF enabled']
  },
  {
    title: 'Database Security',
    provider: 'Encrypted Databases',
    description: 'All databases encrypted with customer-specific keys',
    features: ['Automatic backups', 'Point-in-time recovery', 'Access logging', 'Query monitoring']
  },
  {
    title: 'Network Security',
    provider: 'VPC & Firewall',
    description: 'Isolated network environment with strict access controls',
    features: ['Private subnets', 'Network ACLs', 'Security groups', 'VPN access']
  }
]

const dataHandling = [
  {
    icon: CheckCircle,
    title: 'Data Processing',
    description: 'We process only metadata and AI-generated summaries, never your raw email content or documents.'
  },
  {
    icon: Clock,
    title: 'Data Retention',
    description: 'User data is automatically purged based on configurable retention policies (default: 2 years).'
  },
  {
    icon: Building,
    title: 'Data Location',
    description: 'Data is stored in SOC 2 compliant data centers in your region with no cross-border transfers.'
  },
  {
    icon: AlertTriangle,
    title: 'Incident Response',
    description: '24/7 security monitoring with automated threat detection and immediate incident response.'
  }
]

export default function SecurityPage() {
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
              Max-grade
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                security & privacy
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Your data security and privacy are our top priorities. Learn how we protect your information with industry-leading security measures.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-500" />
                <span>AES-256 Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-green-500" />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Security Features</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Comprehensive security measures designed to protect your data at every level.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {securityFeatures.map((feature, index) => (
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
                      <LiquidGlassIcon icon={feature.icon} size="lg" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {feature.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {feature.details}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Certifications & Compliance</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We maintain the highest industry standards and undergo regular independent audits.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <Award className="w-12 h-12 text-green-500 mx-auto" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {cert.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {cert.description}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={cert.status === 'Current' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'}>
                        {cert.status}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{cert.date}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Secure Infrastructure</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Built on Max-grade cloud infrastructure with multiple layers of security.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {infrastructure.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {item.title}
                    </CardTitle>
                    <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-fit">
                      {item.provider}
                    </Badge>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-3">
                      {item.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {item.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Handling */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Data Handling & Privacy</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Transparent practices for how we collect, process, and protect your data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {dataHandling.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="flex items-start gap-4 p-6 rounded-xl bg-white dark:bg-gray-700 shadow-lg">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Questions About Security?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Our security team is happy to discuss our practices and answer any questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Card className="p-6 border-0 shadow-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Security Team</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">For security-related inquiries</p>
                  <a href="mailto:security@aurelius.ai" className="text-blue-600 dark:text-blue-400 hover:underline">
                    security@aurelius.ai
                  </a>
                </div>
              </Card>
              <Card className="p-6 border-0 shadow-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Vulnerability Reports</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Responsible disclosure program</p>
                  <a href="mailto:security@aurelius.ai" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Report a vulnerability
                  </a>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}