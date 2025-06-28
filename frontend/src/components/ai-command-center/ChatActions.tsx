'use client'

import { useState, useRef } from 'react'
import { Send, Mic, MicOff, Paperclip, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAICommandCenter } from '@/lib/stores/aiCommandCenterStore'
import { cn } from '@/lib/utils/cn'

interface ChatActionsProps {
  message: string
  setMessage: (message: string) => void
  isProcessing: boolean
  onSend: () => void
}

export function ChatActions({ message, setMessage, isProcessing, onSend }: ChatActionsProps) {
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toggle: toggleCommandCenter } = useAICommandCenter()

  const toggleVoiceInput = () => {
    setIsVoiceActive(!isVoiceActive)
    if (!isVoiceActive) {
      startRecording()
    } else {
      stopRecording()
    }
  }

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsRecording(true)
      
      // TODO: Implement actual voice recording with Web Audio API
      // For now, just simulate recording and clean up stream
      setTimeout(() => {
        stopRecording()
        setMessage('This is a simulated voice transcription.')
        // Clean up stream tracks
        stream.getTracks().forEach(track => track.stop())
      }, 3000)
    } catch (error) {
      // Use proper error handling instead of console
      setIsVoiceActive(false)
      // TODO: Add proper error notification system
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsVoiceActive(false)
    // TODO: Stop actual recording and process audio
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // TODO: Handle file upload properly
      // For now, store file reference for future implementation
      setMessage(`File attached: ${file.name}`)
    }
  }

  return (
    <div className="flex items-center justify-center">
      {/* All action buttons in horizontal row - circular inverted */}
      <div className="flex items-center space-x-3">
        {/* Voice input button - circular */}
        <motion.button
          onClick={toggleVoiceInput}
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full transition-all duration-200 font-medium flex items-center justify-center border-2",
            isVoiceActive
              ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600"
              : "bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing}
          title="Voice input"
        >
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div
                key="recording"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <div className="relative">
                  <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        
        {/* File upload button - circular */}
        <motion.button
          onClick={handleFileUpload}
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-transparent text-gray-700 dark:text-gray-300 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing}
          title="Attach file"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
        
        {/* Send button - circular */}
        <motion.button
          onClick={onSend}
          disabled={!message.trim() || isProcessing}
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full font-medium transition-all duration-200 flex items-center justify-center border-2",
            message.trim() && !isProcessing
              ? "bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
              : "bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50"
          )}
          whileHover={message.trim() && !isProcessing ? { scale: 1.05 } : {}}
          whileTap={message.trim() && !isProcessing ? { scale: 0.95 } : {}}
          title="Send message"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.button>
        
        {/* Close button */}
        <motion.button
          onClick={toggleCommandCenter}
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-transparent text-gray-600 dark:text-gray-400 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Close AI Assistant"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
        
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  )
}