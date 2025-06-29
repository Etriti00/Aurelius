import { NextResponse } from 'next/server';
import { generateNonce } from '@/lib/utils/csp-nonce';

export function middleware() {
  const response = NextResponse.next();
  
  // Generate a unique nonce for this request
  const nonce = generateNonce();
  
  // Add nonce to headers for server-side access
  response.headers.set('x-nonce', nonce);
  
  // Set Content Security Policy with nonce
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://vercel.live`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' ws: wss: https:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ];

  // In development, allow localhost connections
  if (process.env.NODE_ENV === 'development') {
    const scriptSrcIndex = cspDirectives.findIndex(directive => directive.startsWith('script-src'));
    if (scriptSrcIndex !== -1) {
      cspDirectives[scriptSrcIndex] += " 'unsafe-eval'"; // Only for Next.js dev mode
    }
    
    const connectSrcIndex = cspDirectives.findIndex(directive => directive.startsWith('connect-src'));
    if (connectSrcIndex !== -1) {
      cspDirectives[connectSrcIndex] += " http://localhost:* ws://localhost:*";
    }
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};