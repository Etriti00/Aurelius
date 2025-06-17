'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BrainIcon } from './BrainIcon'

interface VoiceCommandProps {
  onCommand: (command: string) => void
  isProcessing?: boolean
}

type VoiceState = 'idle' | 'listening' | 'processing'

export function VoiceCommand({ onCommand, isProcessing = false }: VoiceCommandProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const [, setTranscript] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setIsSupported(true)
      
      // Initialize Speech Recognition
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognition = new SpeechRecognition() as ISpeechRecognition
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setVoiceState('listening')
        setTranscript('')
        playStartSound()
      }
      
      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const result = event.results[0][0].transcript
        setTranscript(result)
        setVoiceState('processing')
        onCommand(result)
      }
      
      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setVoiceState('idle')
        setTranscript('')
      }
      
      recognition.onend = () => {
        if (voiceState === 'listening') {
          setVoiceState('idle')
        }
      }
      
      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onCommand, voiceState])

  useEffect(() => {
    if (isProcessing) {
      setVoiceState('processing')
    } else if (voiceState === 'processing') {
      setVoiceState('idle')
    }
  }, [isProcessing, voiceState])

  const playStartSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      }
      
      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800 Hz tone
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      // Audio feedback not available - silent fallback
      // This is expected in some browsers or when audio is disabled
    }
  }

  const handleVoiceToggle = () => {
    if (!isSupported || !recognitionRef.current) return

    if (voiceState === 'idle') {
      recognitionRef.current.start()
    } else if (voiceState === 'listening') {
      recognitionRef.current.stop()
      setVoiceState('idle')
    }
  }

  const getButtonColor = () => {
    switch (voiceState) {
      case 'listening':
        return 'from-orange-400 to-orange-600'
      case 'processing':
        return 'from-red-400 to-red-600'
      default:
        return 'from-gray-300 to-gray-400' // Lunar silver
    }
  }

  const getBackgroundOpacity = () => {
    switch (voiceState) {
      case 'listening':
      case 'processing':
        return 0.9
      default:
        return 0.3 // More transparent for lunar silver effect
    }
  }

  const getBrainColors = () => {
    switch (voiceState) {
      case 'listening':
        return {
          primary: 'from-orange-500 via-orange-600 to-orange-700',
          secondary: 'from-orange-300/60 to-orange-500/60',
          tertiary: 'bg-orange-100/40',
          ring: 'border-orange-400/50'
        }
      case 'processing':
        return {
          primary: 'from-red-500 via-red-600 to-red-700',
          secondary: 'from-red-300/60 to-red-500/60',
          tertiary: 'bg-red-100/40',
          ring: 'border-red-400/50'
        }
      default:
        return {
          primary: 'from-gray-400 via-gray-500 to-gray-600', // Lunar silver
          secondary: 'from-gray-300/60 to-gray-400/60',
          tertiary: 'bg-gray-100/40',
          ring: 'border-gray-400/50'
        }
    }
  }


  if (!isSupported) {
    return null
  }

  return (
    <motion.button
      onClick={handleVoiceToggle}
      disabled={voiceState === 'processing'}
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md bg-white/30 shadow-lg flex items-center justify-center relative overflow-hidden ${
        voiceState === 'processing' ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      whileHover={{ scale: voiceState !== 'processing' ? 1.05 : 1 }}
      whileTap={{ scale: voiceState !== 'processing' ? 0.95 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      title={
        voiceState === 'listening' 
          ? 'Listening... Click to stop'
          : voiceState === 'processing'
          ? 'Processing command...'
          : 'Click to start voice command'
      }
    >
      {/* Background gradient based on state */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${getButtonColor()}`}
        animate={{
          opacity: getBackgroundOpacity()
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Pulse effect for listening state */}
      {voiceState === 'listening' && (
        <motion.div
          className="absolute inset-0 bg-orange-400/30 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Glow effect for processing state */}
      {voiceState === 'processing' && (
        <motion.div
          className="absolute inset-0 bg-red-400/40 rounded-full blur-sm"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Brain Logo with pulsating animation */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="scale-75">
          <BrainIcon 
            size="sm" 
            static={true} 
            colors={getBrainColors()}
          />
        </div>
      </motion.div>

      {/* Processing spinner */}
      {voiceState === 'processing' && (
        <motion.div
          className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
    </motion.button>
  )
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: {
      new(): ISpeechRecognition
    }
    SpeechRecognition: {
      new(): ISpeechRecognition
    }
  }
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null
  onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null
}

interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResultList
  resultIndex: number
}

interface ISpeechRecognitionResultList {
  readonly length: number
  item(index: number): ISpeechRecognitionResult
  [index: number]: ISpeechRecognitionResult
}

interface ISpeechRecognitionResult {
  readonly length: number
  item(index: number): ISpeechRecognitionAlternative
  [index: number]: ISpeechRecognitionAlternative
  isFinal: boolean
}

interface ISpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}