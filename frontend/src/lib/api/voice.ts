import { useState } from 'react'
import useSWR from 'swr'
import { getSession } from 'next-auth/react'
import { apiClient } from './client'
import {
  ProcessVoiceDto,
  TextToSpeechDto,
  VoiceProcessingResult,
  TextToSpeechResult,
  Voice,
  VoiceHistoryItem,
  VoiceHealthCheck,
} from './types'

// API endpoints
const VOICE_ENDPOINT = '/voice'

// Voice API functions
export const voiceApi = {
  // Process voice command with audio file
  processVoiceCommand: async (audioFile: File, options?: ProcessVoiceDto) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    if (options?.language) {
      formData.append('language', options.language)
    }
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata))
    }

    // Get auth token from session
    const session = await getSession()
    const headers: HeadersInit = {}
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`
    }

    // Use fetch directly since we need to handle FormData
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}${VOICE_ENDPOINT}/process`, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Voice processing failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.success ? data.data : data
  },

  // Convert text to speech
  textToSpeech: (data: TextToSpeechDto) =>
    apiClient.post<TextToSpeechResult>(`${VOICE_ENDPOINT}/text-to-speech`, data),

  // Get available voices
  getAvailableVoices: () =>
    apiClient.get<Voice[]>(`${VOICE_ENDPOINT}/voices`),

  // Get user voice history
  getVoiceHistory: (limit = 20, offset = 0) =>
    apiClient.get<VoiceHistoryItem[]>(`${VOICE_ENDPOINT}/history`, { limit, offset }),

  // Check voice service health
  healthCheck: () =>
    apiClient.get<VoiceHealthCheck>(`${VOICE_ENDPOINT}/health`),
}

// SWR Hooks
export const useAvailableVoices = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${VOICE_ENDPOINT}/voices`,
    voiceApi.getAvailableVoices,
    {
      revalidateOnFocus: false,
      refreshInterval: 0, // Voices don't change often
      dedupingInterval: 300000, // 5 minutes
    }
  )

  return {
    voices: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useVoiceHistory = (limit = 20, offset = 0) => {
  const { data, error, isLoading, mutate } = useSWR(
    `${VOICE_ENDPOINT}/history?limit=${limit}&offset=${offset}`,
    () => voiceApi.getVoiceHistory(limit, offset),
    {
      revalidateOnFocus: false,
      refreshInterval: 0, // Only refresh manually
    }
  )

  return {
    history: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useVoiceHealth = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${VOICE_ENDPOINT}/health`,
    voiceApi.healthCheck,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  return {
    health: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

// Voice Processing Hook
export const useVoiceProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data])
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      setAudioChunks([])
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setError(errorMessage)
      throw error
    }
  }

  const stopRecording = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        const audioFile = new File([audioBlob], 'voice-command.wav', { type: 'audio/wav' })
        setIsRecording(false)
        setMediaRecorder(null)
        setAudioChunks([])
        resolve(audioFile)
      }

      mediaRecorder.stop()
    })
  }

  const processVoice = async (audioFile: File, options?: ProcessVoiceDto) => {
    setIsProcessing(true)
    setError(null)
    try {
      const result = await voiceApi.processVoiceCommand(audioFile, options)
      setIsProcessing(false)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process voice'
      setError(errorMessage)
      setIsProcessing(false)
      throw error
    }
  }

  const recordAndProcess = async (options?: ProcessVoiceDto) => {
    try {
      await startRecording()
      // Let user record (this would typically be controlled by UI)
      // For now, just return the recording promise
      return {
        stop: async () => {
          const audioFile = await stopRecording()
          return processVoice(audioFile, options)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Recording failed')
      throw error
    }
  }

  return {
    startRecording,
    stopRecording,
    processVoice,
    recordAndProcess,
    isProcessing,
    isRecording,
    error,
  }
}

// Text-to-Speech Hook
export const useTextToSpeech = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)

  const generateSpeech = async (text: string, options?: Omit<TextToSpeechDto, 'text'>) => {
    setIsGenerating(true)
    setError(null)
    try {
      const result = await voiceApi.textToSpeech({ text, ...options })
      setIsGenerating(false)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech'
      setError(errorMessage)
      setIsGenerating(false)
      throw error
    }
  }

  const playAudio = (audioUrl: string) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
    }

    const audio = new Audio(audioUrl)
    setCurrentAudio(audio)
    audio.play()
    
    audio.onended = () => {
      setCurrentAudio(null)
    }
  }

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setCurrentAudio(null)
    }
  }

  const speakText = async (text: string, options?: Omit<TextToSpeechDto, 'text'>) => {
    const result = await generateSpeech(text, options)
    playAudio(result.audioUrl)
    return result
  }

  return {
    generateSpeech,
    speakText,
    playAudio,
    stopAudio,
    isGenerating,
    isPlaying: !!currentAudio,
    error,
  }
}

// Helper functions
export const formatVoiceProcessingResult = (result: VoiceProcessingResult) => {
  return {
    ...result,
    confidencePercentage: Math.round(result.confidence * 100),
    confidenceColor: result.confidence >= 0.8 ? 'text-green-600' : 
                    result.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600',
    formattedProcessingTime: `${result.processingTime}ms`,
    hasAction: !!result.actionTaken,
  }
}

export const formatVoiceHistory = (history: VoiceHistoryItem[]) => {
  return history.map(item => ({
    ...item,
    confidencePercentage: Math.round(item.confidence * 100),
    formattedDate: new Date(item.createdAt).toLocaleDateString(),
    formattedTime: new Date(item.createdAt).toLocaleTimeString(),
  }))
}

export const getVoiceByCategory = (voices: Voice[]) => {
  return voices.reduce((acc, voice) => {
    if (!acc[voice.category]) {
      acc[voice.category] = []
    }
    acc[voice.category].push(voice)
    return acc
  }, {} as Record<string, Voice[]>)
}

export const getVoiceHealthStatus = (health: VoiceHealthCheck) => {
  const statusColors = {
    healthy: 'text-green-600 bg-green-50',
    degraded: 'text-yellow-600 bg-yellow-50',
    unhealthy: 'text-red-600 bg-red-50',
  }

  return {
    ...health,
    statusColor: statusColors[health.status],
    allServicesHealthy: Object.values(health.services).every(Boolean),
    formattedLatency: {
      transcription: `${health.latency.transcription}ms`,
      synthesis: `${health.latency.synthesis}ms`,
    },
  }
}

// Audio file validation
export const validateAudioFile = (file: File) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a WAV, MP3, OGG, or WebM audio file.')
  }

  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload a file smaller than 10MB.')
  }

  return true
}

// Check if browser supports voice features
export const checkVoiceSupport = () => {
  return {
    mediaRecording: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioPlayback: !!window.Audio,
    speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    speechSynthesis: !!window.speechSynthesis,
  }
}