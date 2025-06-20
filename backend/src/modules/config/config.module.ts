import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  aiConfig,
  integrationsConfig,
  securityConfig,
} from '../../config';
import * as Joi from 'joi';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        aiConfig,
        integrationsConfig,
        securityConfig,
      ],
      validationSchema: Joi.object({
        // App Configuration
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .default('development'),
        PORT: Joi.number().default(3001),
        
        // Database Configuration
        DATABASE_URL: Joi.string().required(),
        
        // Redis Configuration
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        
        // JWT Configuration
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        
        // AI Configuration
        ANTHROPIC_API_KEY: Joi.string().required(),
        
        // OAuth Configuration
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        MICROSOFT_CLIENT_ID: Joi.string().required(),
        MICROSOFT_CLIENT_SECRET: Joi.string().required(),
        
        // Stripe Configuration
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        
        // SendGrid Configuration
        SENDGRID_API_KEY: Joi.string().required(),
      }),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}