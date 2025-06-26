'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  MessageSquare, 
  Github, 
  Twitter, 
  ArrowRight,
  Heart,
  Star,
  Trophy,
  Calendar,
  BookOpen,
  Lightbulb,
  Coffee
} from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const platforms = [
  {
    icon: MessageSquare,
    title: 'Discord Community',
    description: 'Join 5,000+ users in real-time discussions, get help, and share tips.',
    members: '5,234',
    action: 'Join Discord',
    href: 'https://discord.gg/aurelius',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    icon: Github,
    title: 'GitHub Discussions',
    description: 'Request features, report bugs, and contribute to open-source components.',
    members: '1,847',
    action: 'View on GitHub',
    href: 'https://github.com/aurelius-ai/community',
    color: 'from-gray-600 to-gray-800'
  },
  {
    icon: Twitter,
    title: 'Twitter Community',
    description: 'Follow updates, join conversations, and connect with the team.',
    members: '12,500',
    action: 'Follow @AureliusAI',
    href: 'https://twitter.com/AureliusAI',
    color: 'from-blue-400 to-blue-600'
  }
]

const events = [
  {
    type: 'Webinar',
    title: 'Advanced Workflow Automation',
    date: 'January 15, 2025',
    time: '2:00 PM EST',
    description: 'Learn advanced techniques for creating complex automation workflows.',
    attendees: 247
  },
  {
    type: 'Office Hours',
    title: 'Monthly Product Q&A',
    date: 'January 22, 2025',
    time: '1:00 PM EST',
    description: 'Ask questions directly to our product team and get insider insights.',
    attendees: 156
  },
  {
    type: 'Workshop',
    title: 'AI Integration Best Practices',
    date: 'February 5, 2025',
    time: '3:00 PM EST',
    description: 'Hands-on workshop for maximizing AI productivity in your workflow.',
    attendees: 89
  }
]

const resources = [
  {
    icon: BookOpen,
    title: 'User Guides',
    description: 'Comprehensive guides written by community experts',
    count: '50+ guides'
  },
  {
    icon: Lightbulb,
    title: 'Workflow Templates',
    description: 'Ready-to-use automation templates shared by users',
    count: '200+ templates'
  },
  {
    icon: Trophy,
    title: 'Success Stories',
    description: 'Real productivity transformations from our community',
    count: '100+ stories'
  },
  {
    icon: Coffee,
    title: 'Meet & Greets',
    description: 'Local meetups and virtual coffee chats',
    count: '25+ cities'
  }
]

const champions = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager at TechCorp',
    avatar: 'SC',
    contribution: 'Created 15+ workflow templates',
    badge: 'Top Contributor'
  },
  {
    name: 'Miguel Rodriguez',
    role: 'Founder at StartupXYZ',
    avatar: 'MR',
    contribution: 'Helped 200+ users in Discord',
    badge: 'Community Helper'
  },
  {
    name: 'Priya Patel',
    role: 'Operations Lead',
    avatar: 'PP',
    contribution: 'Organized 5 local meetups',
    badge: 'Event Organizer'
  }
]

export default function CommunityPage() {
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
              Join the
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                Aurelius Community
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Connect with thousands of productivity enthusiasts, share workflows, and learn from AI automation experts.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>18,000+ Members</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Active Daily</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>Expert Support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Platforms */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Where We Gather</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Find your preferred way to connect with fellow Aurelius users and our team.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {platforms.map((platform, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white dark:bg-gray-800">
                  <CardHeader>
                    <div className="mb-4">
                      <LiquidGlassIcon icon={platform.icon} size="lg" />
                    </div>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                      {platform.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {platform.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {platform.members}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">members</span>
                    </div>
                    <Link href={platform.href}>
                      <Button variant="primary" className="w-full">
                        {platform.action}
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

      {/* Upcoming Events */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Upcoming Events</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Join us for workshops, Q&As, and networking events.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {events.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {event.type}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100 mb-2">
                      {event.title}
                    </CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                      {event.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-4 h-4 flex items-center justify-center">🕐</span>
                        <span>{event.time}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Register Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Resources */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Community Resources</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Created by the community, for the community.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {resources.map((resource, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <LiquidGlassIcon icon={resource.icon} size="lg" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {resource.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                      {resource.description}
                    </p>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {resource.count}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Champions */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Community Champions</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Meet some of our most active and helpful community members.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {champions.map((champion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                      {champion.avatar}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {champion.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {champion.role}
                    </p>
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 inline-block mb-2">
                      {champion.badge}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {champion.contribution}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to connect?
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Join thousands of productivity enthusiasts and start building amazing workflows together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg">
                Join Discord
                <MessageSquare className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-purple-600">
                Browse Resources
                <BookOpen className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}