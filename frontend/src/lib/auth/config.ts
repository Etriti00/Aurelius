import { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import CredentialsProvider from 'next-auth/providers/credentials'

// Note: Token refresh is handled by marking expired tokens with error flag
// The client can then redirect to sign in when it detects this error

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar',
        },
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID as string,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET as string,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: 'openid email profile https://graph.microsoft.com/mail.read https://graph.microsoft.com/calendars.readwrite https://graph.microsoft.com/files.read',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Development-only mock user for testing
        if (process.env.NODE_ENV === 'development') {
          if (credentials.email === 'demo@aurelius.ai' && credentials.password === 'demo123') {
            return {
              id: 'demo-user-id',
              email: 'demo@aurelius.ai',
              name: 'Demo User',
              image: null,
              accessToken: 'demo-access-token',
              refreshToken: 'demo-refresh-token',
            }
          }
        }

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
          
          // First, get CSRF token
          const healthResponse = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          const csrfToken = healthResponse.headers.get('X-CSRF-Token')

          // Now make the login request with CSRF token
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }

          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken
          }

          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          
          // Our backend returns LoginResponseDto directly (not wrapped)
          if (data.user && data.accessToken) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              image: data.user.avatar,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            }
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
  callbacks: {
    jwt({ token, user, account }) {
      // Initial sign in - modify token in place and return it
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.userId = user.id
        token.accessTokenExpires = Date.now() + (account.expires_in ? account.expires_in * 1000 : 15 * 60 * 1000)
        return token
      }

      // Credentials provider sign in
      if (user?.accessToken) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.userId = user.id
        token.accessTokenExpires = Date.now() + 15 * 60 * 1000
        return token
      }

      // Check if access token has expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to refresh it
      // For non-async callback, return the token with error flag instead of refreshing
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        
        // Pass error to the client side
        if (token.error) {
          session.error = token.error as string
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Handle JWT token refresh
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}