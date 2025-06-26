'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Calendar, User, Clock } from 'lucide-react'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const blogPosts = [
  {
    title: 'The Future of AI-Powered Productivity',
    excerpt: 'Exploring how artificial intelligence is transforming the way we work and collaborate in the modern workplace.',
    author: 'Alexandra Chen',
    date: 'December 15, 2024',
    readTime: '5 min read',
    category: 'AI & Productivity',
    slug: 'future-ai-powered-productivity',
  },
  {
    title: 'Building Human-Centered AI: Our Design Philosophy',
    excerpt: 'Why we believe AI should amplify human intelligence rather than replace it, and how this shapes our product decisions.',
    author: 'Sarah Kim',
    date: 'December 10, 2024',
    readTime: '8 min read',
    category: 'Design',
    slug: 'human-centered-ai-design',
  },
  {
    title: 'Security First: How We Protect Your Data',
    excerpt: 'A deep dive into our security practices, encryption methods, and commitment to user privacy.',
    author: 'Marcus Rodriguez',
    date: 'December 5, 2024',
    readTime: '6 min read',
    category: 'Security',
    slug: 'security-first-data-protection',
  },
]

export default function BlogPage() {
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
              Aurelius
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
              Insights on AI, productivity, and the future of work from the Aurelius team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {blogPosts.map((post, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="liquid-glass rounded-3xl p-8 transition-all duration-300 hover:shadow-lg border-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 mb-6 lg:mb-0 lg:mr-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{post.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{post.readTime}</span>
                          </div>
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{post.title}</h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{post.excerpt}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        <span>By {post.author}</span>
                      </div>
                    </div>
                    <div className="lg:ml-8">
                      <Button variant="outline">
                        Read More
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mt-16"
          >
            <Button variant="outline" size="lg">
              Load More Posts
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="liquid-glass rounded-3xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Stay Updated
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Get the latest insights on AI, productivity, and workplace innovation 
                delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button variant="primary">
                  Subscribe
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}