'use client'

import Link from 'next/link'
import { Github, Twitter, Linkedin, Mail } from 'lucide-react'
import { Brain3DLogo } from '@/components/shared/Brain3DLogo'

const footerLinks = {
  Product: [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Integrations', href: '/features#integrations' },
    { name: 'Changelog', href: '/changelog' },
  ],
  Company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ],
  Resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'API Reference', href: '/api' },
    { name: 'Community', href: '/community' },
    { name: 'Support', href: '/support' },
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Security', href: '/security' },
    { name: 'GDPR', href: '/gdpr' },
  ],
}

const socialLinks = [
  { name: 'GitHub', icon: Github, href: 'https://github.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { name: 'Email', icon: Mail, href: 'mailto:contact@aurelius.ai' },
]

export function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 dark:text-gray-400">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Brand column */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1 mb-6 sm:mb-8 md:mb-0 text-center sm:text-left">
            <div className="mb-3 sm:mb-4 flex items-center justify-center sm:justify-start">
              <Brain3DLogo size="sm" className="[&_span]:text-white dark:[&_span]:text-gray-100 sm:hidden flex-nowrap" static={true} />
              <Brain3DLogo size="md" className="[&_span]:text-white dark:[&_span]:text-gray-100 hidden sm:flex flex-nowrap" static={true} />
            </div>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-4 sm:mb-6 max-w-xs mx-auto sm:mx-0">
              Your AI Chief of Staff. Transform to-do lists into done lists.
            </p>
            <div className="flex justify-center sm:justify-start space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="text-center sm:text-left">
              <h3 className="font-semibold text-white dark:text-gray-200 mb-3 sm:mb-4 text-sm sm:text-base">{category}</h3>
              <ul className="space-y-2 sm:space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 dark:border-gray-900 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 text-center sm:text-left order-2 sm:order-1">
              © {new Date().getFullYear()} Aurelius AI. All rights reserved.
            </p>
            <div className="flex justify-center space-x-4 sm:space-x-6 order-1 sm:order-2">
              <Link href="/privacy" className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors">
                Terms
              </Link>
              <Link href="/cookies" className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-200 transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}