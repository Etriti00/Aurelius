'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, Lightbulb, Target, Users, Globe, Award } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const timeline = [
  {
    year: '2023',
    title: 'Founded',
    description: 'Aurelius AI founded with a vision to create human-centered artificial intelligence.',
  },
  {
    year: '2023',
    title: 'First Product',
    description: 'Launched our AI productivity assistant with email and calendar automation.',
  },
  {
    year: '2024',
    title: 'Series A',
    description: 'Raised $25M Series A to expand our AI capabilities and team.',
  },
  {
    year: '2024',
    title: 'Enterprise Launch',
    description: 'Introduced enterprise features with advanced security and team collaboration.',
  },
]

const achievements = [
  {
    icon: Users,
    metric: '50,000+',
    label: 'Active Users',
    description: 'Professionals worldwide trust Aurelius'
  },
  {
    icon: Globe,
    metric: '45+',
    label: 'Countries',
    description: 'Global reach across continents'
  },
  {
    icon: Award,
    metric: '99.9%',
    label: 'Uptime',
    description: 'Enterprise-grade reliability'
  },
  {
    icon: Brain,
    metric: '2.4M+',
    label: 'AI Actions',
    description: 'Tasks automated monthly'
  },
]

export default function AboutPage() {
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
              About
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                Aurelius AI
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              We're building the future of work—where artificial intelligence amplifies human 
              creativity and intelligence, rather than replacing it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Aurelius was born from a simple observation: despite all our technological advances, 
                professionals still spend countless hours on repetitive, automatable tasks.
              </p>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Our founders, having experienced this frustration firsthand at companies like Google 
                and Tesla, decided to build something different—an AI that doesn't just follow commands, 
                but truly understands how humans work.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Named after the Roman Emperor Marcus Aurelius, who emphasized the importance of wisdom 
                and thoughtful action, our AI embodies these same principles in the digital workplace.
              </p>
              <Link href="/company">
                <Button variant="primary" size="lg">
                  Meet Our Team
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
                  <LiquidGlassIcon icon={Lightbulb} size="xl" />
                  <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
                    The Vision
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    "Technology should amplify human intelligence, not replace it. We're building 
                    AI that works alongside humans, understanding context and intent."
                  </p>
                  <p className="text-sm text-gray-500 mt-4 font-medium">
                    — Alexandra Chen, CEO
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-20 bg-gray-50 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">By the Numbers</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our impact on productivity and professional satisfaction continues to grow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="text-center liquid-glass rounded-3xl p-8"
              >
                <div className="mb-6">
                  <LiquidGlassIcon icon={achievement.icon} size="lg" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{achievement.metric}</div>
                <div className="text-lg font-semibold text-gray-700 mb-2">{achievement.label}</div>
                <div className="text-sm text-gray-600">{achievement.description}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Journey</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a bold idea to a platform trusted by thousands of professionals worldwide.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="relative flex items-start mb-12 last:mb-0"
                >
                  {/* Timeline dot */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm mr-8 flex-shrink-0 shadow-lg">
                    {item.year}
                  </div>
                  
                  {/* Content */}
                  <div className="liquid-glass rounded-2xl p-6 flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <LiquidGlassIcon icon={Target} size="xl" className="mx-auto" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              To democratize access to intelligent automation, empowering every professional 
              to achieve more while maintaining their humanity and creativity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Join Our Mission
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/careers">
                <Button variant="outline" size="lg">
                  Work With Us
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