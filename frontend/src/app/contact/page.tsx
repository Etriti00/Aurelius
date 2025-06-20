'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Users, Zap } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const contactOptions = [
  {
    icon: MessageCircle,
    title: 'General Inquiries',
    description: 'Questions about Aurelius or how we can help your team',
    email: 'hello@aurelius.ai',
    action: 'Send Message',
  },
  {
    icon: Users,
    title: 'Sales & Partnerships',
    description: 'Enterprise solutions and partnership opportunities',
    email: 'sales@aurelius.ai',
    action: 'Contact Sales',
  },
  {
    icon: Zap,
    title: 'Technical Support',
    description: 'Help with your account, integrations, or technical issues',
    email: 'support@aurelius.ai',
    action: 'Get Support',
  },
]

const officeInfo = [
  { icon: MapPin, label: 'Address', value: '548 Market St, San Francisco, CA 94104' },
  { icon: Phone, label: 'Phone', value: '+1 (555) 123-4567' },
  { icon: Mail, label: 'Email', value: 'hello@aurelius.ai' },
  { icon: Clock, label: 'Hours', value: 'Mon-Fri 9AM-6PM PST' },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    // Form data would be sent to backend API
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 bg-gradient-to-b from-slate-50 to-white granular-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
              Let's build the future of
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                productivity together
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-12 leading-relaxed px-4 sm:px-0">
              Whether you're interested in our products, want to explore partnerships, 
              or just have questions, we'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-12 sm:mb-16 lg:mb-20">
            {contactOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Card className="liquid-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full transition-all duration-300 hover:shadow-lg border-0">
                  <div className="text-center">
                    <div className="mb-4 sm:mb-6">
                      <LiquidGlassIcon icon={option.icon} size="lg" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{option.title}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">{option.description}</p>
                    <p className="text-xs sm:text-sm font-medium text-blue-600 mb-4 sm:mb-6">{option.email}</p>
                    <Button variant="outline" className="w-full h-12 sm:h-11 text-sm sm:text-base active:scale-[0.98] transition-transform">
                      {option.action}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Contact Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2 order-2 lg:order-1"
            >
              <Card className="liquid-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Send us a message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full h-12 sm:h-10 text-base sm:text-sm"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full h-12 sm:h-10 text-base sm:text-sm"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full h-12 sm:h-10 text-base sm:text-sm"
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full h-12 sm:h-10 text-base sm:text-sm"
                        placeholder="What's this about?"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                      placeholder="Tell us more about your inquiry..."
                      required
                    />
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full h-12 sm:h-11 text-base sm:text-sm active:scale-[0.98] transition-transform">
                    Send Message
                    <Send className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>

                  <p className="text-sm text-gray-600 text-center">
                    We'll get back to you within 24 hours
                  </p>
                </form>
              </Card>
            </motion.div>

            {/* Office Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6 sm:space-y-8 order-1 lg:order-2"
            >
              <Card className="liquid-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Get in Touch</h3>
                <div className="space-y-4 sm:space-y-6">
                  {officeInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">{info.label}</p>
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed break-words">{info.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="liquid-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Response Times</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">General Inquiries</span>
                    <span className="font-medium text-sm sm:text-base text-gray-900 whitespace-nowrap">&lt; 24 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">Sales Questions</span>
                    <span className="font-medium text-sm sm:text-base text-gray-900 whitespace-nowrap">&lt; 4 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">Support Issues</span>
                    <span className="font-medium text-sm sm:text-base text-gray-900 whitespace-nowrap">&lt; 1 hour</span>
                  </div>
                </div>
              </Card>

              <Card className="liquid-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Prefer to schedule?</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm leading-relaxed">
                  Book a 30-minute discovery call to discuss your specific needs and see how Aurelius can help your team.
                </p>
                <Button variant="outline" className="w-full h-12 sm:h-11 text-sm sm:text-base active:scale-[0.98] transition-transform">
                  Schedule a Call
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}