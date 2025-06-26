'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, Star, Zap, Shield } from 'lucide-react'
import { LiquidGlassIcon } from '@/components/shared/LiquidGlassIcon'

const plans = [
  {
    id: 'professional',
    name: 'Professional',
    price: { monthly: 30, yearly: 324 },
    description: 'Essential AI productivity for individuals',
    icon: Star,
    color: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50/50 to-indigo-50/30',
    features: [
      { text: '1 workspace + 3 integrations', included: true },
      { text: '1,000 AI actions monthly', included: true },
      { text: 'Email & calendar automation', included: true },
      { text: 'Smart task management', included: true },
      { text: 'iOS & macOS apps', included: true },
      { text: '10GB secure storage', included: true },
      { text: 'Advanced workflows', included: false },
      { text: 'API access', included: false },
    ],
    popular: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: { monthly: 50, yearly: 540 },
    description: 'Enhanced productivity for growing teams',
    icon: Zap,
    color: 'from-indigo-600 to-purple-600',
    bgGradient: 'from-indigo-50/50 to-purple-50/30',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: '1,500 AI actions monthly', included: true },
      { text: 'Team collaboration tools', included: true },
      { text: 'Advanced workflows', included: true },
      { text: 'Priority support', included: true },
      { text: '50GB secure storage', included: true },
      { text: 'Full API access', included: true },
      { text: 'Admin controls', included: true },
    ],
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: { monthly: 100, yearly: 1080 },
    description: 'Maximum power for large organizations',
    icon: Shield,
    color: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-50/50 to-green-50/30',
    features: [
      { text: 'Everything in Team', included: true },
      { text: '2,000 AI actions monthly', included: true },
      { text: 'Unlimited integrations', included: true },
      { text: 'Max security features', included: true },
      { text: 'SSO & SAML integration', included: true },
      { text: '100GB secure storage', included: true },
      { text: 'Custom team workflows', included: true },
      { text: 'Dedicated support', included: true },
    ],
    popular: false,
  },
]

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden granular-bg">
      {/* Apple-inspired background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-white to-blue-50/30 dark:from-gray-950/50 dark:via-gray-900 dark:to-blue-950/30" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 dark:from-blue-800/20 dark:to-indigo-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-l from-purple-200/30 to-violet-200/30 dark:from-purple-800/20 dark:to-violet-800/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 tracking-tight">
            Choose your
            <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-300 dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
              intelligence level
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed px-4 sm:px-0">
            Professional AI productivity for individuals and teams. 
            Upgrade, downgrade, or cancel anytime. No contracts, no commitments.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center liquid-glass-subtle rounded-xl sm:rounded-2xl p-0.5 sm:p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                billingPeriod === 'monthly'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                billingPeriod === 'yearly'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Annual
              <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="relative group"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.5 }}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 liquid-glass rounded-xl sm:rounded-2xl shadow-lg border-2 border-white/30"
                  >
                    <LiquidGlassIcon icon={Sparkles} size="sm" animate={true} />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm">Most Popular</span>
                  </motion.div>
                </div>
              )}

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`relative h-full rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 text-white dark:text-black border border-gray-700/50 dark:border-gray-300/50 shadow-xl shadow-gray-900/25 dark:shadow-white/25'
                    : 'liquid-glass'
                }`}
              >
                {/* Subtle inner gradient */}
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <div className="relative">
                  {/* Plan header */}
                  <div className="mb-6 sm:mb-8">
                    <div className="mb-4 sm:mb-6">
                      <LiquidGlassIcon 
                        icon={plan.icon} 
                        size="lg" 
                      />
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold mb-1 sm:mb-2 tracking-tight ${plan.popular ? 'text-white dark:text-black' : 'text-gray-900 dark:text-gray-100'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm sm:text-base leading-relaxed ${plan.popular ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-baseline mb-2">
                      <span className={`text-3xl sm:text-4xl md:text-5xl font-bold ${plan.popular ? 'text-white dark:text-black' : 'text-gray-900 dark:text-gray-100'}`}>
                        ${plan.price[billingPeriod]}
                      </span>
                      <span className={`ml-1 sm:ml-2 text-sm sm:text-lg font-medium ${plan.popular ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                        /{billingPeriod === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {plan.id === 'teams' && (
                      <p className={`text-xs sm:text-sm ${plan.popular ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                        per user
                      </p>
                    )}
                    {billingPeriod === 'yearly' && (
                      <p className={`text-xs sm:text-sm font-semibold ${plan.popular ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600'}`}>
                        Save ${plan.price.monthly * 12 - plan.price.yearly} annually
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 sm:gap-3">
                        {feature.included ? (
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            plan.popular ? 'bg-emerald-500/20 dark:bg-emerald-200/30' : 'bg-emerald-100 dark:bg-emerald-200'
                          }`}>
                            <Check className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                              plan.popular ? 'text-emerald-400 dark:text-emerald-700' : 'text-emerald-600'
                            }`} />
                          </div>
                        ) : (
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            plan.popular ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            <span className={`text-[10px] sm:text-xs ${plan.popular ? 'text-gray-500 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>–</span>
                          </div>
                        )}
                        <span className={`text-xs sm:text-sm leading-relaxed ${
                          plan.popular 
                            ? feature.included ? 'text-gray-100 dark:text-gray-800' : 'text-gray-500 dark:text-gray-600'
                            : feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href="/signup" className="block">
                    <Button
                      variant={plan.popular ? "outline" : "dark"}
                      size="lg"
                      className="w-full"
                    >
                      {plan.id === 'teams' ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-12 sm:mt-16 md:mt-20">
          <div className="inline-flex flex-col items-center">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
              Need something bigger?
            </h3>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Let&apos;s build a custom plan for your enterprise
            </p>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}