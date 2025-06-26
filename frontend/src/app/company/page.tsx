'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Globe, Target, Heart } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const stats = [
  { label: 'AI Actions Processed', value: '2.4M+' },
  { label: 'Hours Saved Daily', value: '12,000+' },
  { label: 'Max Customers', value: '150+' },
  { label: 'Countries Served', value: '45+' },
]

const values = [
  {
    icon: Target,
    title: 'Human-Centered AI',
    description: 'We believe AI should amplify human intelligence, not replace it. Our technology is designed to understand and adapt to how you naturally work.',
  },
  {
    icon: Users,
    title: 'Inclusive Innovation',
    description: 'Building accessible AI tools that work for everyone, regardless of technical expertise or working style.',
  },
  {
    icon: Globe,
    title: 'Global Impact',
    description: 'Empowering professionals worldwide to achieve more while maintaining work-life balance.',
  },
  {
    icon: Heart,
    title: 'Ethical Foundation',
    description: 'Committed to responsible AI development with privacy, security, and transparency at our core.',
  },
]

const team = [
  {
    name: 'Alexandra Chen',
    role: 'CEO & Co-founder',
    bio: 'Former VP of Product at Google, PhD in Machine Learning from Stanford',
    image: '/api/placeholder/400/400',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CTO & Co-founder',
    bio: 'Ex-Tesla Autopilot team lead, 15+ years in AI systems architecture',
    image: '/api/placeholder/400/400',
  },
  {
    name: 'Sarah Kim',
    role: 'Head of Design',
    bio: 'Previously at Apple Human Interface team, expert in AI UX design',
    image: '/api/placeholder/400/400',
  },
  {
    name: 'David Thompson',
    role: 'Head of AI Research',
    bio: 'Former OpenAI researcher, published 50+ papers on neural networks',
    image: '/api/placeholder/400/400',
  },
]

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
              Redefining productivity through
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                intelligent automation
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
              Founded in 2023, Aurelius is on a mission to create AI technology that truly understands 
              how humans work, think, and collaborate.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                We're building the world's first AI chief of staff that doesn't just automate tasks—it 
                understands context, learns preferences, and anticipates needs with human-like intuition.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Every day, millions of professionals spend hours on repetitive work that could be 
                intelligently automated. We believe that time should be spent on creativity, strategy, 
                and meaningful human connections.
              </p>
              <Link href="/contact">
                <Button variant="primary" size="lg">
                  Join Our Mission
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="liquid-glass rounded-3xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <LiquidGlassIcon icon={Target} size="xl" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-4">
                    Vision 2030
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    A world where AI amplifies human potential, making everyone more productive, 
                    creative, and fulfilled in their work.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Our Values</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              The principles that guide everything we build and every decision we make.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="liquid-glass rounded-3xl p-8"
              >
                <div className="mb-6">
                  <LiquidGlassIcon icon={value.icon} size="lg" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Leadership Team</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Experienced leaders from top technology companies, united by a shared vision 
              for the future of work.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{member.name}</h3>
                <p className="text-sm font-medium text-blue-600 mb-3">{member.role}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 dark:bg-gray-950 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to transform your productivity?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of professionals who've already discovered the future of work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Get Started Free
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