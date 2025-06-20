import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesGrid } from '@/components/landing/FeaturesGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PricingSection } from '@/components/landing/PricingSection'
import { Footer } from '@/components/landing/Footer'

// SEO structured data for the homepage
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Aurelius AI - Your AI Chief of Staff",
  "description": "Transform productivity with AI automation. Perfect memory, proactive execution, deep integrations.",
  "url": "https://aurelius.ai",
  "mainEntity": {
    "@type": "SoftwareApplication",
    "name": "Aurelius AI",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web, iOS, macOS",
    "offers": [
      {
        "@type": "Offer",
        "name": "Pro Plan",
        "price": "40",
        "priceCurrency": "USD",
        "billingIncrement": "monthly"
      },
      {
        "@type": "Offer", 
        "name": "Max Plan",
        "price": "80",
        "priceCurrency": "USD",
        "billingIncrement": "monthly"
      }
    ]
  }
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main className="min-h-screen bg-white relative overflow-hidden">
        {/* Enhanced Apple-inspired global background */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          {/* Base gradient with more sophistication */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40" />
          
          {/* Primary floating orbs with enhanced motion */}
          <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
          
          {/* Mid-layer atmospheric orbs */}
          <div className="absolute left-1/4 top-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/20 to-blue-300/15 rounded-full blur-2xl opacity-70 animate-pulse" style={{ animationDelay: '1s', animationDuration: '12s' }} />
          <div className="absolute right-1/4 bottom-1/3 w-[400px] h-[400px] bg-gradient-to-tl from-indigo-300/20 to-purple-300/15 rounded-full blur-2xl opacity-60 animate-pulse" style={{ animationDelay: '5s', animationDuration: '9s' }} />
          
          {/* Floating interaction elements */}
          <div className="absolute top-1/5 left-3/4 w-40 h-40 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/4 left-1/5 w-32 h-32 bg-gradient-to-l from-violet-500/20 to-purple-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }} />
          <div className="absolute top-2/3 right-1/5 w-28 h-28 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          
          {/* Geometric pattern overlays */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59, 130, 246) 1px, transparent 0)`,
              backgroundSize: '80px 80px'
            }} />
          </div>
          
          {/* Hexagonal subtle pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.1'%3E%3Cpolygon points='60,10 90,30 90,70 60,90 30,70 30,30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '120px 120px'
            }} />
          </div>
          
          {/* Mesh gradient overlay for depth */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at bottom left, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
              `
            }} />
          </div>
          
          {/* Subtle noise texture for premium feel */}
          <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23000' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px'
            }} />
          </div>
          
          {/* Dynamic light rays */}
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-blue-400/20 via-transparent to-purple-400/20 opacity-30 animate-pulse" style={{ animationDuration: '15s' }} />
          <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-indigo-400/15 via-transparent to-cyan-400/15 opacity-20 animate-pulse" style={{ animationDuration: '18s', animationDelay: '2s' }} />
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-violet-400/15 via-transparent to-blue-400/15 opacity-25 animate-pulse" style={{ animationDuration: '20s', animationDelay: '4s' }} />
        </div>
        
        <HeroSection />
        <FeaturesGrid />
        <HowItWorks />
        <PricingSection />
        <Footer />
      </main>
    </>
  )
}