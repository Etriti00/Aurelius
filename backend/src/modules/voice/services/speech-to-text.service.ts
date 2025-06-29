import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CacheService } from '../../cache/services/cache.service';
import { createHash } from 'crypto';
import FormData from 'form-data';
import { BusinessException } from '../../../common/exceptions';

interface TranscriptionRequest {
  audioBuffer: Buffer;
  language?: string;
  model?: 'whisper-1';
  prompt?: string;
  temperature?: number;
  format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface OpenAITranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface OpenAITranslationResponse {
  text: string;
}

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private cacheService: CacheService
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured for speech-to-text');
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const cacheKey = this.generateCacheKey(request.audioBuffer);

    // Check cache first
    const cached = await this.cacheService.get<TranscriptionResponse>(cacheKey);
    if (cached) {
      this.logger.debug('STT cache hit');
      return cached;
    }

    try {
      const formData = new FormData();
      formData.append('file', request.audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      formData.append('model', request.model || 'whisper-1');

      if (request.language) {
        formData.append('language', request.language);
      }

      if (request.prompt) {
        formData.append('prompt', request.prompt);
      }

      if (request.temperature !== undefined) {
        formData.append('temperature', request.temperature.toString());
      }

      formData.append('response_format', request.format || 'verbose_json');

      const response = await this.httpService.axiosRef.post<OpenAITranscriptionResponse>(
        `${this.baseUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.apiKey}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      const result: TranscriptionResponse = {
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        words: response.data.words,
      };

      // Cache for 24 hours
      await this.cacheService.set(cacheKey, result, 86400);

      this.logger.debug(`Transcribed audio: ${result.text.substring(0, 50)}...`);

      return result;
    } catch (error) {
      const axiosError = error as { response?: { data?: object; status?: number } };
      this.logger.error('Speech-to-text failed', axiosError.response?.data || error);

      if (axiosError.response?.status === 401) {
        throw new BusinessException('Invalid OpenAI API key', 'INVALID_API_KEY');
      } else if (axiosError.response?.status === 429) {
        throw new BusinessException('OpenAI rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      } else if (axiosError.response?.status === 413) {
        throw new BusinessException('Audio file too large', 'FILE_TOO_LARGE');
      }

      throw new BusinessException('Speech-to-text transcription failed', 'STT_FAILED', undefined, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Translate audio to English
   */
  async translateToEnglish(audioBuffer: Buffer): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });
      formData.append('model', 'whisper-1');

      const response = await this.httpService.axiosRef.post<OpenAITranslationResponse>(
        `${this.baseUrl}/audio/translations`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.text;
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error('Audio translation failed', axiosError);
      throw new BusinessException('Audio translation failed', 'TRANSLATION_FAILED', undefined, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(audioBuffer: Buffer): Promise<string> {
    try {
      const result = await this.transcribe({
        audioBuffer,
        format: 'verbose_json',
      });

      return result.language || 'unknown';
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error('Language detection failed', axiosError);
      return 'unknown';
    }
  }

  /**
   * Get word-level timestamps
   */
  async getWordTimestamps(audioBuffer: Buffer): Promise<
    Array<{
      word: string;
      start: number;
      end: number;
    }>
  > {
    try {
      const result = await this.transcribe({
        audioBuffer,
        format: 'verbose_json',
      });

      return result.words || [];
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error('Failed to get word timestamps', axiosError);
      return [];
    }
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(audioBuffer: Buffer): boolean {
    // Check file signature for common audio formats
    const signatures = {
      // MP3
      mp3: [0xff, 0xfb],
      mp3_id3: [0x49, 0x44, 0x33],
      // WAV
      wav: [0x52, 0x49, 0x46, 0x46],
      // OGG
      ogg: [0x4f, 0x67, 0x67, 0x53],
      // WebM
      webm: [0x1a, 0x45, 0xdf, 0xa3],
      // M4A
      m4a: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    };

    for (const [format, signature] of Object.entries(signatures)) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (audioBuffer[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.logger.debug(`Detected audio format: ${format}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Generate cache key for audio
   */
  private generateCacheKey(audioBuffer: Buffer): string {
    const hash = createHash('sha256').update(audioBuffer).digest('hex');

    return `stt:whisper:${hash}`;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await this.httpService.axiosRef.get<{ id: string }>(
        `${this.baseUrl}/models/whisper-1`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error('STT health check failed', axiosError);
      return false;
    }
  }
}
