'use client'

import { motion } from 'framer-motion'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
            <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                These Terms of Service govern your use of Aurelius AI's services. By using our services, 
                you agree to these terms.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                By accessing and using our services, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Use License</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                We grant you a limited, non-exclusive, non-transferable license to use our services 
                in accordance with these terms.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                You are responsible for maintaining the confidentiality of your account and for all 
                activities that occur under your account.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions about these Terms of Service, please contact us at legal@aurelius.ai
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}