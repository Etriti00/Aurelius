interface RequiredEnvVar {
  key: string;
  description: string;
  required: boolean;
  isPublic: boolean;
}

interface EnvValidationResult {
  isValid: boolean;
  missingRequired: string[];
  warnings: string[];
}

const requiredEnvVars: RequiredEnvVar[] = [
  // NextAuth Configuration
  { key: 'NEXTAUTH_SECRET', description: 'NextAuth.js secret for session encryption', required: true, isPublic: false },
  { key: 'NEXTAUTH_URL', description: 'NextAuth.js canonical URL', required: true, isPublic: false },

  // API Configuration
  { key: 'NEXT_PUBLIC_API_URL', description: 'Backend API URL', required: true, isPublic: true },

  // OAuth Providers (Optional)
  { key: 'AUTH_GOOGLE_ID', description: 'Google OAuth Client ID', required: false, isPublic: false },
  { key: 'AUTH_GOOGLE_SECRET', description: 'Google OAuth Client Secret', required: false, isPublic: false },
  { key: 'AUTH_AZURE_AD_CLIENT_ID', description: 'Microsoft Azure AD Client ID', required: false, isPublic: false },
  { key: 'AUTH_AZURE_AD_CLIENT_SECRET', description: 'Microsoft Azure AD Client Secret', required: false, isPublic: false },
  { key: 'AUTH_AZURE_AD_TENANT_ID', description: 'Microsoft Azure AD Tenant ID', required: false, isPublic: false },

  // Stripe (Optional)
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', description: 'Stripe publishable key for billing', required: false, isPublic: true },

  // Demo Environment Variables (Development only)
  { key: 'DEMO_USER_EMAIL', description: 'Demo user email for development', required: false, isPublic: false },
  { key: 'DEMO_USER_PASSWORD', description: 'Demo user password for development', required: false, isPublic: false },
  { key: 'NEXT_PUBLIC_DEMO_USER_EMAIL', description: 'Demo user email for frontend display', required: false, isPublic: true },
  { key: 'NEXT_PUBLIC_DEMO_USER_PASSWORD', description: 'Demo user password for frontend display', required: false, isPublic: true },
];

function getEnvValue(key: string): string | undefined {
  // For client-side, we can only access NEXT_PUBLIC_ variables
  if (typeof window !== 'undefined') {
    return key.startsWith('NEXT_PUBLIC_') ? process.env[key] : undefined;
  }
  
  // Server-side can access all environment variables
  return process.env[key];
}

export function validateEnvironment(): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    missingRequired: [],
    warnings: []
  };

  const isClientSide = typeof window !== 'undefined';

  for (const envVar of requiredEnvVars) {
    // Skip non-public variables on client side
    if (isClientSide && !envVar.isPublic) {
      continue;
    }

    const value = getEnvValue(envVar.key);

    if (!value) {
      if (envVar.required) {
        result.missingRequired.push(`${envVar.key}: ${envVar.description}`);
        result.isValid = false;
      } else {
        result.warnings.push(`${envVar.key} not set: ${envVar.description}`);
      }
    }
  }

  return result;
}

export function validateAndWarn(): void {
  const result = validateEnvironment();

  if (!result.isValid) {
    console.error('Frontend environment validation failed');
    
    if (result.missingRequired.length > 0) {
      console.error('Missing required environment variables:');
      result.missingRequired.forEach(missing => {
        console.error(`  - ${missing}`);
      });
    }

    // Don't throw on frontend - just warn
    console.warn('Application may not function correctly with missing environment variables');
  }

  if (result.warnings.length > 0) {
    console.warn('Frontend environment validation warnings:');
    result.warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Frontend environment validation passed successfully');
  }
}

export function getRequiredVariables(): string[] {
  return requiredEnvVars
    .filter(envVar => envVar.required)
    .map(envVar => envVar.key);
}

export function isDemoEnvironmentConfigured(): boolean {
  return Boolean(
    getEnvValue('NEXT_PUBLIC_DEMO_USER_EMAIL') && 
    getEnvValue('NEXT_PUBLIC_DEMO_USER_PASSWORD')
  );
}

export function getPublicEnvInfo(): Record<string, string | undefined> {
  const publicVars = requiredEnvVars
    .filter(envVar => envVar.isPublic)
    .reduce((acc, envVar) => {
      acc[envVar.key] = getEnvValue(envVar.key);
      return acc;
    }, {} as Record<string, string | undefined>);

  return publicVars;
}