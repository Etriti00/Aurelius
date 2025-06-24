import { SetMetadata } from '@nestjs/common';

export const API_KEY_METADATA = 'requireApiKey';
export const RequireApiKey = () => SetMetadata(API_KEY_METADATA, true);

export const ALLOWED_API_KEY_SCOPES = 'allowedApiKeyScopes';
export const ApiKeyScopes = (...scopes: string[]) => SetMetadata(ALLOWED_API_KEY_SCOPES, scopes);
