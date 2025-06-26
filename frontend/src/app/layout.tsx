import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/providers/session-provider'
import { ThemeProvider } from '@/lib/hooks/useTheme'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Aurelius AI - Your AI Chief of Staff | AI Productivity Assistant',
  description: 'Aurelius is your AI chief of staff that understands your work style, anticipates your needs, and executes tasks with human-like precision. Transform productivity with AI automation for email, calendar, and task management.',
  keywords: [
    'AI assistant', 'AI chief of staff', 'AI productivity', 'artificial intelligence assistant',
    'AI automation', 'AI email management', 'AI calendar', 'AI task management',
    'personal AI assistant', 'AI workflow automation', 'AI executive assistant',
    'smart productivity', 'AI scheduling', 'intelligent automation', 'AI integration',
    'workplace AI', 'AI tools', 'productivity software', 'AI platform',
    'automated assistant', 'AI productivity suite', 'business AI assistant'
  ],
  authors: [{ name: 'Aurelius AI Team', url: 'https://aurelius.ai' }],
  creator: 'Aurelius AI',
  publisher: 'Aurelius AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://aurelius.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Aurelius AI - Your AI Chief of Staff | AI Productivity Assistant',
    description: 'Transform productivity with AI automation. Aurelius anticipates your needs and executes tasks with precision. Perfect memory, proactive execution, deep integrations.',
    type: 'website',
    locale: 'en_US',
    url: 'https://aurelius.ai',
    siteName: 'Aurelius AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aurelius AI - Your AI Chief of Staff',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurelius AI - Your AI Chief of Staff',
    description: 'Transform productivity with AI automation. Perfect memory, proactive execution, deep integrations.',
    creator: '@AureliusAI',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getCookie(name) {
                  const value = '; ' + document.cookie;
                  const parts = value.split('; ' + name + '=');
                  if (parts.length === 2) return parts.pop().split(';').shift();
                  return null;
                }
                
                const savedTheme = getCookie('theme');
                let actualTheme = 'light';
                
                if (savedTheme === 'light' || savedTheme === 'dark') {
                  actualTheme = savedTheme;
                } else {
                  // Default to system preference if no saved theme
                  actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(actualTheme);
                document.documentElement.style.colorScheme = actualTheme;
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Aurelius AI",
              "applicationCategory": "BusinessApplication",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "2847"
              },
              "offers": {
                "@type": "Offer",
                "price": "40",
                "priceCurrency": "USD"
              },
              "description": "AI chief of staff that understands your work style, anticipates your needs, and executes tasks with human-like precision.",
              "operatingSystem": "Web, iOS, macOS",
              "url": "https://aurelius.ai",
              "publisher": {
                "@type": "Organization",
                "name": "Aurelius AI"
              }
            })
          }}
        />
      </head>
      <body className={`font-inter antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}