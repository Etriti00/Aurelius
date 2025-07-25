import { registerAs } from '@nestjs/config';

export default registerAs('integrations', () => ({
  // Google OAuth & APIs
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/tasks',
    ],
    apiKey: process.env.GOOGLE_API_KEY,
  },

  // Microsoft OAuth & APIs
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri:
      process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/auth/microsoft/callback',
    tenant: process.env.MICROSOFT_TENANT || 'common',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Mail.Read',
      'Mail.Send',
      'Calendars.ReadWrite',
      'Tasks.ReadWrite',
      'Files.ReadWrite',
      'User.Read',
    ],
  },

  // Slack
  slack: {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/auth/slack/callback',
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'files:read',
      'files:write',
      'users:read',
      'users:read.email',
    ],
  },

  // Paddle
  paddle: {
    apiKey: process.env.PADDLE_API_KEY,
    vendorId: process.env.PADDLE_VENDOR_ID,
    vendorAuthCode: process.env.PADDLE_VENDOR_AUTH_CODE,
    publicKey: process.env.PADDLE_PUBLIC_KEY,
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET,
    environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    priceIds: {
      professional: process.env.PADDLE_PRICE_PRO || 'price_pro',
      team: process.env.PADDLE_PRICE_TEAM || 'price_team',
      enterprise: process.env.PADDLE_PRICE_ENTERPRISE || 'price_enterprise',
    },
    trialDays: parseInt(process.env.PADDLE_TRIAL_DAYS || '14', 10),
  },

  // SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'hello@aurelius.ai',
    fromName: process.env.SENDGRID_FROM_NAME || 'Aurelius AI',
    templates: {
      welcome: process.env.SENDGRID_TEMPLATE_WELCOME,
      passwordReset: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET,
      emailVerification: process.env.SENDGRID_TEMPLATE_EMAIL_VERIFICATION,
      notification: process.env.SENDGRID_TEMPLATE_NOTIFICATION,
    },
  },

  // Twilio (SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    enabled: process.env.TWILIO_ENABLED === 'true',
  },

  // Webhook Configuration
  webhooks: {
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'aurelius-webhook-secret',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
  },

  // OAuth Defaults
  oauth: {
    stateExpiry: parseInt(process.env.OAUTH_STATE_EXPIRY || '600', 10), // 10 minutes
    tokenRefreshBuffer: parseInt(process.env.OAUTH_REFRESH_BUFFER || '300', 10), // 5 minutes
  },

  // Integration Sync Settings
  sync: {
    defaultInterval: parseInt(process.env.SYNC_DEFAULT_INTERVAL || '300', 10), // 5 minutes
    maxConcurrent: parseInt(process.env.SYNC_MAX_CONCURRENT || '5', 10),
    retryDelay: parseInt(process.env.SYNC_RETRY_DELAY || '60000', 10), // 1 minute
  },
}));
