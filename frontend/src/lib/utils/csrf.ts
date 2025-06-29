interface CSRFTokenCache {
  token: string;
  expires: number;
}

interface CSRFError extends Error {
  name: 'CSRFError';
  statusCode: number;
}

class CSRFTokenManager {
  private tokenCache: CSRFTokenCache | null = null;
  private readonly TOKEN_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private fetchPromise: Promise<string> | null = null;

  /**
   * Get a valid CSRF token, fetching from server if needed
   */
  async getCSRFToken(): Promise<string> {
    // Return cached token if valid
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.token;
    }

    // If already fetching, wait for the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch new token
    this.fetchPromise = this.fetchTokenFromServer();
    
    try {
      const token = await this.fetchPromise;
      return token;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchTokenFromServer(): Promise<string> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    
    try {
      const response = await fetch(`${apiUrl}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const csrfToken = response.headers.get('X-CSRF-Token');
      
      if (!csrfToken) {
        throw new Error('CSRF token not found in response headers');
      }

      // Cache the token
      this.tokenCache = {
        token: csrfToken,
        expires: Date.now() + this.TOKEN_CACHE_DURATION,
      };

      return csrfToken;
    } catch (error) {
      console.error('CSRF token fetch error:', error);
      throw new Error(`Failed to obtain CSRF token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invalidate cached token (call when CSRF error occurs)
   */
  invalidateToken(): void {
    this.tokenCache = null;
    this.fetchPromise = null;
  }

  /**
   * Check if an error is a CSRF error
   */
  isCSRFError(error: unknown): error is CSRFError {
    return (
      error instanceof Error &&
      ((error as CSRFError).name === 'CSRFError' ||
      (error as CSRFError).statusCode === 403 ||
      error.message.toLowerCase().includes('csrf'))
    );
  }

  /**
   * Handle CSRF error by invalidating token
   */
  handleCSRFError(error: unknown): void {
    if (this.isCSRFError(error)) {
      this.invalidateToken();
    }
  }
}

// Export singleton instance
export const csrfTokenManager = new CSRFTokenManager();

/**
 * Get CSRF token for API requests
 */
export async function getCSRFToken(): Promise<string> {
  return csrfTokenManager.getCSRFToken();
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCSRFToken(method: string): boolean {
  const statefulMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  return statefulMethods.includes(method.toUpperCase());
}

/**
 * Add CSRF token to headers if required
 */
export async function addCSRFHeaders(
  method: string,
  headers: HeadersInit = {}
): Promise<HeadersInit> {
  if (!requiresCSRFToken(method)) {
    return headers;
  }

  try {
    const csrfToken = await getCSRFToken();
    
    return {
      ...headers,
      'X-CSRF-Token': csrfToken,
    };
  } catch (error) {
    console.error('Failed to add CSRF token to headers:', error);
    throw new Error(`CSRF token required but could not be obtained: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}