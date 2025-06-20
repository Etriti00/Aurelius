'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, MapPin, Clock, Users, Heart, Zap, Globe } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const openPositions = [
  {
    title: 'Senior AI Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    description: 'Build the next generation of AI productivity tools with cutting-edge machine learning.',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    description: 'Design intuitive interfaces that make complex AI interactions feel effortless.',
  },
  {
    title: 'Developer Relations Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Help developers integrate Aurelius into their workflows through APIs and SDKs.',
  },
  {
    title: 'Sales Development Representative',
    department: 'Sales',
    location: 'San Francisco, CA',
    type: 'Full-time',
    description: 'Drive growth by connecting with potential customers and understanding their needs.',
  },
  {
    title: 'Data Scientist',
    department: 'AI Research',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    description: 'Analyze user behavior patterns to improve AI decision-making and automation.',
  },
  {
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Remote',
    type: 'Full-time',
    description: 'Ensure enterprise customers achieve maximum value from their Aurelius investment.',
  },
]

const benefits = [
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health insurance, mental health support, and wellness stipends.',
  },
  {
    icon: Zap,
    title: 'Growth & Learning',
    description: '$3,000 annual learning budget plus conference attendance and internal mentorship.',
  },
  {
    icon: Globe,
    title: 'Remote-First Culture',
    description: 'Work from anywhere with quarterly team gatherings and flexible schedules.',
  },
  {
    icon: Users,
    title: 'Equity & Impact',
    description: 'Meaningful equity package and the opportunity to shape the future of work.',
  },
]

const values = [
  {
    title: 'Human-Centered Innovation',
    description: 'We build technology that amplifies human potential, not replaces it.',
  },
  {
    title: 'Continuous Learning',
    description: 'We stay curious, embrace challenges, and learn from our mistakes.',
  },
  {
    title: 'Inclusive Excellence',
    description: 'Diverse perspectives make us stronger and our products better.',
  },
  {
    title: 'Transparent Communication',
    description: 'We share openly, give honest feedback, and assume positive intent.',
  },
]

export default function CareersPage() {
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
              Shape the future of
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                intelligent work
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Join a team of passionate builders creating AI that amplifies human creativity 
              and transforms how professionals work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg">
                View Open Positions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                Learn About Our Culture
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide how we work, build, and grow together.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="liquid-glass rounded-3xl p-8"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Why Join Aurelius</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We believe in taking care of our team so they can do their best work.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center liquid-glass rounded-3xl p-8"
              >
                <div className="mb-6">
                  <LiquidGlassIcon icon={benefit.icon} size="lg" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Open Positions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to make an impact? Join our growing team of innovators.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            {openPositions.map((position, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="liquid-glass rounded-3xl p-8 transition-all duration-300 hover:shadow-lg border-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 mb-6 lg:mb-0">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{position.title}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {position.department}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 leading-relaxed">{position.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{position.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{position.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="lg:ml-8">
                      <Button variant="outline">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mt-16"
          >
            <div className="liquid-glass rounded-3xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Don't see a perfect fit?
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We're always looking for exceptional talent. Send us your resume and 
                tell us how you'd like to contribute to the future of work.
              </p>
              <Link href="/contact">
                <Button variant="primary" size="lg">
                  Get in Touch
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
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
              Ready to build the future?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join us in creating AI that empowers rather than replaces human intelligence.
            </p>
            <Link href="/contact">
              <Button variant="primary" size="lg">
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}