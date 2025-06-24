export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: string[];
  emailVerified?: Date;
  passwordHash?: string;
  googleId?: string;
  microsoftId?: string;
  appleId?: string;
  stripeCustomerId?: string;
  voiceId: string;
  voiceSpeed: number;
  voicePitch: number;
  preferredInput: string;
  voiceLanguage: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationFrequency: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  deletedAt?: Date;
  preferences: any;
  timezone: string;
}

export interface RequestUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string | null;
  roles?: string[];
  iat?: number;
  exp?: number;
}
