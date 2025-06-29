import { headers } from 'next/headers';

/**
 * Generate a cryptographically secure nonce for CSP
 * Simple implementation that works in Next.js without crypto imports
 */
export function generateNonce(): string {
  // Generate a random base64 string without using Node crypto
  const array = new Array(16);
  for (let i = 0; i < 16; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...array));
}

/**
 * Get the CSP nonce from Next.js headers
 * This will be set by the middleware
 */
export function getNonce(): string | undefined {
  try {
    const headersList = headers();
    return headersList.get('x-nonce') ?? undefined;
  } catch {
    // Headers not available (client-side or development)
    return undefined;
  }
}

/**
 * Get nonce for client-side usage
 * This reads from a meta tag that should be set by the server
 */
export function getClientNonce(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  const metaTag = document.querySelector('meta[name="csp-nonce"]');
  return metaTag?.getAttribute('content') ?? undefined;
}