import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

import { ElevenLabsService } from './services/elevenlabs.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { VoiceAnalyticsService } from './services/voice-analytics.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIServiceException } from '../../common/exceptions/app.exception';
import {
  VoiceProcessRequest,
  VoiceProcessResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
  VoiceContextEnhancement,
  AvailableVoice,
  VoiceInteractionHistory,
  VoiceServiceHealth,
  VoiceAnalyticsData,
  AudioGenerationRequest,
  AudioGenerationResponse,
  ElevenLabsVoice,
  UserContextCounts,
  VoiceIntent,
} from '../../common/types/voice.types';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly elevenLabsService: ElevenLabsService,
    private readonly speechToTextService: SpeechToTextService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
    private readonly aiGatewayService: AIGatewayService,
    private readonly prisma: PrismaService
  ) {}

  async processVoiceCommand(request: VoiceProcessRequest): Promise<VoiceProcessResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Convert speech to text
      const transcript = await this.speechToText({
        audioBuffer: request.audioBuffer,
        language: request.language || 'en',
      });

      this.logger.debug(`Voice transcript: "${transcript}"`);

      // Step 2: Enhance transcript with user context
      const enhancedRequest = await this.enhanceWithContext(
        transcript,
        request.userId,
        request.metadata
      );

      // Step 3: Process through AI Gateway
      const aiResponse = await this.aiGatewayService.processRequest({
        prompt: enhancedRequest.prompt,
        context: enhancedRequest.context,
        systemPrompt: this.getVoiceSystemPrompt(),
        userId: request.userId,
        action: 'voice-command',
        userSubscription: request.userSubscription,
        metadata: {
          type: 'voice-interaction',
          urgency: 'normal',
        },
      });

      // Step 4: Convert response to speech
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { voiceId: true, voiceSpeed: true },
      });

      const audioResponse = await this.textToSpeech({
        text: aiResponse.text,
        userId: request.userId,
        voiceId: user?.voiceId || 'rachel',
      });

      // Step 5: Store interaction record
      await this.prisma.voiceInteraction.create({
        data: {
          userId: request.userId,
          type: 'voice_command',
          provider: 'openai',
          inputText: transcript,
          outputText: aiResponse.text,
          audioFileUrl: audioResponse.audioUrl,
          duration: (Date.now() - startTime) / 1000,
          language: request.language || 'en-US',
          metadata: {
            intent: enhancedRequest.intent,
            confidence: enhancedRequest.confidence,
          },
        },
      });

      const response: VoiceProcessResponse = {
        transcript,
        intent: enhancedRequest.intent,
        confidence: enhancedRequest.confidence,
        responseText: aiResponse.text,
        responseAudioUrl: audioResponse.audioUrl,
        duration: Date.now() - startTime,
      };

      // Track analytics
      await this.voiceAnalyticsService.trackInteraction(request.userId, {
        transcript,
        intent: enhancedRequest.intent || 'general',
        confidence: enhancedRequest.confidence || 0,
        responseTime: response.duration,
        success: true,
      });

      this.logger.debug(
        `Voice command processed for user ${request.userId}: ${response.duration}ms`
      );

      return response;
    } catch (error) {
      this.logger.error('Voice command processing failed', error);
      throw error;
    }
  }

  async speechToText(request: SpeechToTextRequest): Promise<string> {
    try {
      const result = await this.speechToTextService.transcribe({
        audioBuffer: request.audioBuffer,
        language: request.language || 'en',
        model: 'whisper-1',
      });

      return result.text;
    } catch (error) {
      this.logger.error('Speech-to-text conversion failed', error);
      throw new AIServiceException('Voice transcription failed');
    }
  }

  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    try {
      const optimizedText = this.optimizeTextForSpeech(request.text);

      const audioResponse = await this.elevenLabsService.generateAudio({
        text: optimizedText,
        voiceId: request.voiceId || 'rachel',
        modelId: 'eleven_monolingual_v1',
        voiceSettings: {
          stability: request.voiceSettings?.stability || 0.75,
          similarityBoost: request.voiceSettings?.similarityBoost || 0.75,
          style: request.voiceSettings?.style || 0.5,
          useSpeakerBoost: true,
        },
      });

      // Save audio file and return URL
      const filename = `voice-response-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}.mp3`;
      const filepath = `./uploads/voice/${filename}`;

      fs.writeFileSync(filepath, audioResponse.audioBuffer);

      const audioUrl = `/uploads/voice/${filename}`;

      return { audioUrl };
    } catch (error) {
      this.logger.error('Text-to-speech conversion failed', error);
      throw new AIServiceException('Voice synthesis failed');
    }
  }

  async getAvailableVoices(): Promise<AvailableVoice[]> {
    try {
      const voices = await this.elevenLabsService.getAvailableVoices();

      // Filter and format voices for the frontend
      return voices
        .filter(
          (voice: ElevenLabsVoice) => voice.category === 'premade' || voice.category === 'cloned'
        )
        .map((voice: ElevenLabsVoice) => ({
          id: voice.voice_id,
          name: voice.name,
          description: voice.description,
          category: voice.category,
          labels: voice.labels,
          previewUrl: voice.preview_url,
        }));
    } catch (error) {
      this.logger.error('Failed to fetch available voices', error);
      return [];
    }
  }

  async getUserVoiceHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<VoiceInteractionHistory[]> {
    try {
      const interactions = await this.prisma.voiceInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          inputText: true,
          outputText: true,
          duration: true,
          metadata: true,
          createdAt: true,
        },
      });

      return interactions.map(interaction => ({
        id: interaction.id,
        inputText: interaction.inputText !== null ? interaction.inputText : '',
        outputText: interaction.outputText !== null ? interaction.outputText : '',
        duration: interaction.duration !== null ? interaction.duration : 0,
        metadata: interaction.metadata as Record<string, string | number | boolean | null>,
        createdAt: interaction.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch user voice history', error);
      return [];
    }
  }

  private async enhanceWithContext(
    transcript: string,
    userId: string,
    metadata?: Record<string, string | number | boolean | null>
  ): Promise<VoiceContextEnhancement> {
    try {
      // Get user context
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              tasks: { where: { status: { not: 'ARCHIVED' } } },
              emailThreads: { where: { isRead: false } },
              events: {
                where: {
                  startTime: { gte: new Date() },
                  status: 'CONFIRMED',
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Build context from user's current state
      const contextParts: string[] = [];

      // Type assertion for _count - Prisma includes are typed as any by default
      const userWithCount = user as typeof user & { _count: UserContextCounts };

      if (userWithCount._count?.tasks > 0) {
        contextParts.push(`User has ${userWithCount._count.tasks} active tasks`);
      }

      if (userWithCount._count?.emailThreads > 0) {
        contextParts.push(`${userWithCount._count.emailThreads} unread emails`);
      }

      if (userWithCount._count?.events > 0) {
        contextParts.push(`${userWithCount._count.events} upcoming calendar events`);
      }

      const currentTime = new Date().toLocaleString();
      contextParts.push(`Current time: ${currentTime}`);

      if (metadata?.location) {
        contextParts.push(`User location: ${metadata.location}`);
      }

      const context = contextParts.join('. ');

      // Analyze intent
      const intent = this.analyzeIntent(transcript);
      const confidence = this.calculateConfidence(transcript, intent);

      return {
        prompt: transcript,
        context,
        intent,
        confidence,
      };
    } catch (error) {
      this.logger.error('Failed to enhance voice command with context', error);
      return {
        prompt: transcript,
        context: 'Unable to load user context',
      };
    }
  }

  private analyzeIntent(transcript: string): VoiceIntent {
    const text = transcript.toLowerCase();

    // Define intent patterns
    const intentPatterns = {
      schedule: /\b(schedule|book|calendar|meeting|appointment)\b/,
      email: /\b(email|send|draft|message)\b/,
      task: /\b(task|todo|remind|deadline)\b/,
      query: /\b(what|when|where|who|how|why)\b/,
      search: /\b(find|search|look)\b/,
      status: /\b(status|update|progress)\b/,
      help: /\b(help|assistance|support)\b/,
    };

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(text)) {
        return intent as VoiceIntent;
      }
    }

    return 'general' as VoiceIntent;
  }

  private calculateConfidence(transcript: string, intent: VoiceIntent): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on transcript clarity
    if (transcript.length > 10) confidence += 0.1;
    if (transcript.length > 50) confidence += 0.1;

    // Adjust based on intent specificity
    if (intent !== 'general') confidence += 0.1;

    // Check for command words
    const commandWords = ['please', 'can you', 'could you', 'would you'];
    if (commandWords.some(word => transcript.toLowerCase().includes(word))) {
      confidence += 0.05;
    }

    return Math.min(0.95, confidence);
  }

  private optimizeTextForSpeech(text: string): string {
    return (
      text
        // Remove markdown and formatting
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim()
        // Add natural pauses
        .replace(/\./g, '.')
        .replace(/,/g, ',')
        // Limit length for better speech synthesis
        .substring(0, 2000)
    );
  }

  private getVoiceSystemPrompt(): string {
    return `You are Aurelius, responding to a voice command. Your response will be converted to speech, so:

1. Keep responses conversational and natural for speaking
2. Avoid complex formatting, lists, or technical jargon
3. Use short, clear sentences
4. Be concise but helpful
5. Acknowledge the voice interaction naturally (e.g., "I heard you ask about...")
6. If you need to list items, use natural speech patterns like "First... Second... Third..."

Remember: This will be spoken aloud, so make it sound natural and engaging.`;
  }

  async healthCheck(): Promise<VoiceServiceHealth> {
    const [elevenLabsHealthy, sttHealthy] = await Promise.all([
      this.elevenLabsService.healthCheck(),
      this.speechToTextService.healthCheck(),
    ]);

    return {
      healthy: elevenLabsHealthy && sttHealthy,
      services: {
        elevenlabs: elevenLabsHealthy,
        speechToText: sttHealthy,
      },
    };
  }

  async speechToTextWithResponse(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    try {
      const text = await this.speechToText(request);
      return {
        text,
        confidence: 0.95, // This would come from the actual STT service
        language: request.language || 'en-US',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Speech to text conversion failed: ${errorMessage}`, error);
      throw new AIServiceException(`Speech to text failed: ${errorMessage}`);
    }
  }

  async generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    try {
      const response = await this.elevenLabsService.generateAudio({
        text: request.text,
        voiceId: request.voiceId,
        modelId: request.modelId,
        voiceSettings: {
          stability: request.voiceSettings?.stability ?? 0.75,
          similarityBoost: request.voiceSettings?.similarityBoost ?? 0.75,
          style: request.voiceSettings?.style ?? 0.5,
          useSpeakerBoost: request.voiceSettings?.useSpeakerBoost ?? true,
        },
      });

      return {
        audioBuffer: response.audioBuffer,
        contentType: 'audio/mpeg',
        duration: Math.floor(request.text.length * 0.1), // Rough estimate
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audio generation failed: ${errorMessage}`, error);
      throw new AIServiceException(`Audio generation failed: ${errorMessage}`);
    }
  }

  async getVoiceAnalytics(userId: string): Promise<VoiceAnalyticsData[]> {
    try {
      const recentInteractions = await this.prisma.voiceInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return recentInteractions.map(interaction => {
        const metadata = interaction.metadata as Record<string, string | number | boolean | null>;
        return {
          transcript: interaction.inputText !== null ? interaction.inputText : '',
          intent: typeof metadata.detectedIntent === 'string' ? metadata.detectedIntent : 'unknown',
          confidence: typeof metadata.confidence === 'number' ? metadata.confidence : 0.5,
          responseTime: typeof metadata.processingTime === 'number' ? metadata.processingTime : 0,
          success: typeof metadata.success === 'boolean' ? metadata.success : true,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get voice analytics: ${errorMessage}`, error);
      return [];
    }
  }
}
