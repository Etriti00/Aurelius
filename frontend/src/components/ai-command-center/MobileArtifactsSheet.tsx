'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'
import { ArtifactsPanel } from './ArtifactsPanel'

export function MobileArtifactsSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const { artifacts, pendingActions, messages } = useAICommandCenter()
  
  const hasContent = artifacts.length > 0 || pendingActions.length > 0 || messages.length > 0
  
  if (!hasContent) return null
  
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden absolute top-4 right-4 px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-lg text-xs font-medium"
      >
        AI Responses ({artifacts.length + pendingActions.length})
      </button>
      
      {/* Mobile sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/20 z-40"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl z-50"
            >
              {/* Handle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Content */}
              <div className="h-full pt-12 px-4 pb-4">
                <ArtifactsPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}