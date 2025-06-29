// Voice module type definitions
// Professional implementation without shortcuts

export interface VoiceProcessRequest {
  audioBuffer: Buffer;
  userId: string;
  userSubscription: {
    tier: 'PRO' | 'MAX' | 'TEAMS';
    actionsUsed?: number;
    actionsLimit?: number;
  };
  language?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface VoiceProcessResponse {
  transcript: string;
  intent?: string;
  confidence?: number;
  responseText: string;
  responseAudioUrl?: string;
  duration: number;
}

export interface TextToSpeechRequest {
  text: string;
  userId: string;
  voiceId?: string;
  voiceSettings?: VoiceSettings;
}

export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TextToSpeechResponse {
  audioUrl: string;
}

export interface SpeechToTextRequest {
  audioBuffer: Buffer;
  language?: string;
  model?: string;
}

export interface SpeechToTextResponse {
  text: string;
  confidence?: number;
  language?: string;
}

export interface VoiceContextEnhancement {
  prompt: string;
  context: string;
  intent?: string;
  confidence?: number;
}

export interface AvailableVoice {
  id: string;
  name: string;
  description: string;
  category: string;
  labels: Record<string, string | number | boolean | null>;
  previewUrl?: string;
}

export interface VoiceInteractionHistory {
  id: string;
  inputText: string;
  outputText: string;
  duration: number;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

export interface VoiceServiceHealth {
  healthy: boolean;
  services: Record<string, boolean>;
}

export interface VoiceAnalyticsData {
  transcript: string;
  intent: string;
  confidence: number;
  responseTime: number;
  success: boolean;
}

export interface AudioGenerationRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings: VoiceSettings;
}

export interface AudioGenerationResponse {
  audioBuffer: Buffer;
  contentType: string;
  duration?: number;
}

// ElevenLabs specific types
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description: string;
  category: 'premade' | 'cloned' | 'generated';
  labels: Record<string, string | number | boolean | null>;
  preview_url?: string;
  available_for_tiers?: string[];
}

// User voice preferences
export interface UserVoicePreferences {
  preferredVoiceId?: string;
  voiceSpeed?: number;
  autoRespond?: boolean;
  language?: string;
}

// Intent analysis types
export type VoiceIntent =
  | 'schedule'
  | 'email'
  | 'task'
  | 'query'
  | 'search'
  | 'status'
  | 'help'
  | 'general';

export interface IntentPattern {
  intent: VoiceIntent;
  pattern: RegExp;
  confidence: number;
}

export interface UserContextCounts {
  tasks: number;
  emailThreads: number;
  events: number;
}
