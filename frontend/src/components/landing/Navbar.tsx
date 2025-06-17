'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { Brain3DLogo } from '@/components/shared/Brain3DLogo'

const navItems = [
  { name: 'Features', href: '/features' },
  { name: 'How it Works', href: '/#how-it-works' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Company', href: '/company' },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-2xl shadow-lg shadow-gray-200/20 border-b border-white/20'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Brain3DLogo size="sm" className="sm:hidden flex-nowrap" static={true} />
          <Brain3DLogo size="md" className="hidden sm:flex flex-nowrap" static={true} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold text-gray-700 hover:text-gray-900 rounded-xl sm:rounded-2xl hover:bg-gray-100/60 transition-all duration-200 backdrop-blur-sm"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            <Link href="/signin">
              <Button variant="ghost" size="default">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="default">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-100/60 backdrop-blur-sm hover:bg-gray-200/60 transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <motion.div
              animate={isMobileMenuOpen ? { rotate: 90 } : { rotate: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-gray-200/50 shadow-lg overflow-y-auto max-h-[calc(100vh-64px)]"
          >
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-2 sm:space-y-3">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="block px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100/60 rounded-xl sm:rounded-2xl transition-all duration-200 backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div 
                className="pt-4 sm:pt-6 space-y-2 sm:space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Link href="/signin" className="block">
                  <Button variant="outline" size="lg" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup" className="block">
                  <Button variant="primary" size="lg" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}