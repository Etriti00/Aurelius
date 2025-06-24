import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

import { AIServiceException } from '../../../common/exceptions/app.exception';

interface ElevenLabsConfig {
  apiKey: string;
  baseUrl: string;
}

interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface GenerateAudioRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
}

interface GenerateAudioResponse {
  audioBuffer: Buffer;
  duration?: number;
}

interface TranscribeRequest {
  audioBuffer: Buffer;
  language?: string;
  model?: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly config: ElevenLabsConfig;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }

    this.config = {
      apiKey,
      baseUrl: 'https://api.elevenlabs.io/v1',
    };
  }

  async generateAudio(request: GenerateAudioRequest): Promise<GenerateAudioResponse> {
    const cacheKey = this.generateTTSCacheKey(request);

    // Check cache first
    const cached = await this.cacheManager.get<Buffer>(cacheKey);
    if (cached) {
      this.logger.debug(`TTS cache hit for voice ${request.voiceId}`);
      return { audioBuffer: cached };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/text-to-speech/${request.voiceId}`, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text: this.optimizeTextForSpeech(request.text),
          model_id: request.modelId || 'eleven_monolingual_v1',
          voice_settings: request.voiceSettings || {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`);

        if (response.status === 401) {
          throw new AIServiceException('Invalid ElevenLabs API key');
        } else if (response.status === 429) {
          throw new AIServiceException('ElevenLabs rate limit exceeded');
        } else {
          throw new AIServiceException(`TTS generation failed: ${errorText}`);
        }
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Cache the audio for 7 days
      await this.cacheManager.set(cacheKey, audioBuffer, 604800);

      this.logger.debug(
        `Generated TTS audio: ${audioBuffer.length} bytes for voice ${request.voiceId}`
      );

      return { audioBuffer };
    } catch (error) {
      this.logger.error('ElevenLabs TTS generation failed', error);
      throw error instanceof AIServiceException
        ? error
        : new AIServiceException('TTS generation failed');
    }
  }

  async transcribeAudio(request: TranscribeRequest): Promise<string> {
    const cacheKey = this.generateSTTCacheKey(request.audioBuffer);

    // Check cache first
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      this.logger.debug('STT cache hit');
      return cached;
    }

    try {
      // Note: ElevenLabs doesn't provide STT directly
      // This is a placeholder for implementing with another service like OpenAI Whisper
      // For now, we'll return a placeholder implementation

      // In a real implementation, you would:
      // 1. Convert audio to the required format
      // 2. Send to Whisper API or similar service
      // 3. Return the transcription

      const formData = new FormData();
      const audioBlob = new Blob([request.audioBuffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', request.model || 'whisper-1');

      if (request.language) {
        formData.append('language', request.language);
      }

      // This would be an OpenAI Whisper API call
      // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${openAiApiKey}`,
      //   },
      //   body: formData,
      // });

      // For now, return placeholder
      const transcript = 'Audio transcription not yet implemented';

      // Cache for 24 hours
      await this.cacheManager.set(cacheKey, transcript, 86400);

      return transcript;
    } catch (error) {
      this.logger.error('Audio transcription failed', error);
      throw new AIServiceException('Audio transcription failed');
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    const cacheKey = 'elevenlabs:voices';

    // Check cache first (cache for 1 hour)
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      const voices = data.voices || [];

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, voices, 3600);

      return voices;
    } catch (error) {
      this.logger.error('Failed to fetch available voices', error);
      return [];
    }
  }

  async getVoiceInfo(voiceId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voice info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch voice info for ${voiceId}`, error);
      return null;
    }
  }

  private optimizeTextForSpeech(text: string): string {
    return (
      text
        // Remove markdown formatting
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
        // Add pauses for better speech flow
        .replace(/\. /g, '. ')
        .replace(/\? /g, '? ')
        .replace(/! /g, '! ')
    );
  }

  private generateTTSCacheKey(request: GenerateAudioRequest): string {
    const keyData = {
      text: request.text,
      voiceId: request.voiceId,
      modelId: request.modelId,
      voiceSettings: request.voiceSettings,
    };

    const hash = createHash('sha256').update(JSON.stringify(keyData)).digest('hex');

    return `elevenlabs:tts:${hash}`;
  }

  private generateSTTCacheKey(audioBuffer: Buffer): string {
    const hash = createHash('sha256').update(audioBuffer).digest('hex');

    return `elevenlabs:stt:${hash}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error('ElevenLabs health check failed', error);
      return false;
    }
  }
}
