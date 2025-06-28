'use client'

// UI imports removed as using custom styling
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface OverviewCardProps {
  title: string
  value: string
  change: string
  icon: LucideIcon
  trend: 'up' | 'down' | 'neutral'
}

export function OverviewCard({ title, value, change, icon: Icon, trend }: OverviewCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />
      case 'down':
        return <TrendingDown className="w-3 h-3" />
      default:
        return <Minus className="w-3 h-3" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
      case 'down':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50'
    }
  }

  const handleCardClick = () => {
    // Navigate to detailed view based on card title
    switch (title.toLowerCase()) {
      case "today's tasks":
        window.location.href = '/dashboard#tasks'
        break
      case 'unread emails':
        window.location.href = '/email'
        break
      case 'meetings today':
        window.location.href = '/calendar'
        break
      case 'ai actions':
        alert(`AI Actions Usage: ${value}\n${change}\n\nView detailed usage in billing section.`)
        break
      default:
        alert(`${title}: ${value}\n${change}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <button 
        onClick={handleCardClick}
        className="relative liquid-glass-accent rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 h-full hover:scale-[1.02] transition-all duration-500 w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-1">{title}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{value}</p>
              <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="ml-1 truncate max-w-[80px] sm:max-w-[120px]">{change}</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-black dark:bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-black/25 dark:shadow-white/25 flex-shrink-0">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white dark:text-black" />
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  )
}