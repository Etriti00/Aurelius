'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, Star, Zap, Shield, ArrowRight, HelpCircle } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for trying out Aurelius',
    icon: Star,
    color: 'from-gray-500 to-gray-600',
    bgGradient: 'from-gray-50/50 to-gray-50/30',
    features: [
      { text: '1 workspace', included: true },
      { text: '2 integrations', included: true },
      { text: '100 AI actions monthly', included: true },
      { text: 'Basic email automation', included: true },
      { text: 'Community support', included: true },
      { text: '1GB storage', included: true },
      { text: 'Advanced workflows', included: false },
      { text: 'API access', included: false },
    ],
    popular: false,
    ctaText: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 40, yearly: 400 },
    description: 'Essential AI productivity for individuals',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50/50 to-indigo-50/30',
    features: [
      { text: '1 workspace + 10 integrations', included: true },
      { text: '1,200 AI actions monthly', included: true },
      { text: 'Email & calendar automation', included: true },
      { text: 'Smart task management', included: true },
      { text: 'iOS & macOS apps', included: true },
      { text: '10GB secure storage', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
    popular: true,
    ctaText: 'Start Free Trial',
  },
  {
    id: 'max',
    name: 'Max',
    price: { monthly: 80, yearly: 800 },
    description: 'Unlimited AI power for professionals',
    icon: Sparkles,
    color: 'from-indigo-600 to-purple-600',
    bgGradient: 'from-indigo-50/50 to-purple-50/30',
    features: [
      { text: 'Unlimited integrations', included: true },
      { text: '5,000 AI actions monthly', included: true },
      { text: 'Cross-platform workflows', included: true },
      { text: 'AI insights & analytics', included: true },
      { text: 'Custom automations', included: true },
      { text: '100GB secure storage', included: true },
      { text: 'Full API access', included: true },
      { text: 'White-glove onboarding', included: true },
    ],
    popular: false,
    ctaText: 'Start Free Trial',
  },
  {
    id: 'teams',
    name: 'Teams',
    price: { monthly: 50, yearly: 500 },
    description: 'Collaborative AI for growing teams',
    icon: Shield,
    color: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-50/50 to-green-50/30',
    features: [
      { text: 'Shared team workspace', included: true },
      { text: '2,000 AI actions per user', included: true },
      { text: 'Admin controls & analytics', included: true },
      { text: 'Team collaboration tools', included: true },
      { text: 'Enterprise support', included: true },
      { text: '50GB storage per user', included: true },
      { text: 'SSO & SAML integration', included: true },
      { text: 'Custom team workflows', included: true },
    ],
    popular: false,
    ctaText: 'Contact Sales',
  },
]

const faqs = [
  {
    question: 'Can I change my plan anytime?',
    answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we\'ll prorate any billing differences.',
  },
  {
    question: 'What happens if I exceed my AI action limit?',
    answer: 'Your account will continue to work, but additional actions will be queued until your next billing cycle. You can upgrade your plan anytime for immediate access to more actions.',
  },
  {
    question: 'Do you offer discounts for nonprofits or students?',
    answer: 'Yes! We offer 50% discounts for verified nonprofit organizations and educational institutions. Contact our sales team to learn more.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade encryption, SOC 2 compliance, and never store or train on your personal data. Your privacy is our priority.',
  },
  {
    question: 'How does the free trial work?',
    answer: 'All paid plans include a 14-day free trial with full access to features. No credit card required to start. You can cancel anytime during the trial.',
  },
  {
    question: 'Can I use Aurelius on multiple devices?',
    answer: 'Yes! Your Aurelius account works across all your devices - web, mobile, and desktop apps. Your data syncs automatically.',
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
              Choose your
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                intelligence level
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Professional AI productivity for individuals and teams. 
              Start free, upgrade anytime. No contracts, no commitments.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center liquid-glass-subtle rounded-2xl p-1 mb-16">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  billingPeriod === 'monthly'
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  billingPeriod === 'yearly'
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent font-bold">
                  Save 17%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="relative group"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.5 }}
                      className="inline-flex items-center gap-2 px-6 py-3 liquid-glass rounded-2xl shadow-lg border-2 border-white/30"
                    >
                      <LiquidGlassIcon icon={Sparkles} size="sm" animate={true} />
                      <span className="text-slate-700 font-semibold text-sm">Most Popular</span>
                    </motion.div>
                  </div>
                )}

                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`relative h-full rounded-3xl p-8 transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-b from-gray-900 to-gray-800 text-white border border-gray-700/50 shadow-xl shadow-gray-900/25'
                      : 'liquid-glass'
                  }`}
                >
                  <div className="relative">
                    {/* Plan header */}
                    <div className="mb-8">
                      <div className="mb-6">
                        <LiquidGlassIcon 
                          icon={plan.icon} 
                          size="lg" 
                        />
                      </div>
                      <h3 className={`text-2xl font-bold mb-2 tracking-tight ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-base leading-relaxed ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline mb-2">
                        {plan.price[billingPeriod] === 0 ? (
                          <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                            Free
                          </span>
                        ) : (
                          <>
                            <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                              ${plan.price[billingPeriod]}
                            </span>
                            <span className={`ml-2 text-lg font-medium ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                              /{billingPeriod === 'yearly' ? 'year' : 'month'}
                            </span>
                          </>
                        )}
                      </div>
                      {plan.id === 'teams' && plan.price[billingPeriod] > 0 && (
                        <p className={`text-sm ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                          per user
                        </p>
                      )}
                      {billingPeriod === 'yearly' && plan.price.yearly > 0 && (
                        <p className={`text-sm font-semibold ${plan.popular ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Save ${plan.price.monthly * 12 - plan.price.yearly} annually
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3">
                          {feature.included ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              plan.popular ? 'bg-emerald-500/20' : 'bg-emerald-100'
                            }`}>
                              <Check className={`w-3 h-3 ${
                                plan.popular ? 'text-emerald-400' : 'text-emerald-600'
                              }`} />
                            </div>
                          ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              plan.popular ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                              <span className={`text-xs ${plan.popular ? 'text-gray-500' : 'text-gray-400'}`}>–</span>
                            </div>
                          )}
                          <span className={`text-sm leading-relaxed ${
                            plan.popular 
                              ? feature.included ? 'text-gray-100' : 'text-gray-500'
                              : feature.included ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link href={plan.id === 'teams' ? '/contact' : '/signup'} className="block">
                      <Button
                        variant={plan.popular ? "outline" : "primary"}
                        size="lg"
                        className="w-full"
                      >
                        {plan.ctaText}
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 bg-gray-50 granular-bg">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="liquid-glass rounded-3xl p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Enterprise Solutions
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Custom AI workflows, dedicated support, and enterprise-grade security 
                for organizations with 100+ users.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">Unlimited</div>
                  <div className="text-sm text-gray-600">AI Actions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">24/7</div>
                  <div className="text-sm text-gray-600">Premium Support</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">Custom</div>
                  <div className="text-sm text-gray-600">Integrations</div>
                </div>
              </div>
              <Link href="/contact">
                <Button variant="primary" size="lg">
                  Contact Sales
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about our pricing and plans.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="mb-6"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full text-left liquid-glass rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</h3>
                    <HelpCircle className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-45' : ''
                    }`} />
                  </div>
                  {openFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pt-4 border-t border-gray-200"
                    >
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}