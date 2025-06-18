import { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { JWT } from 'next-auth/jwt'

// Refresh token function
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()
    
    if (!response.ok) {
      throw refreshedTokens
    }
    
    // Handle standardized API response
    const tokenData = refreshedTokens.success ? refreshedTokens.data : refreshedTokens

    return {
      ...token,
      accessToken: tokenData.accessToken,
      accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
      refreshToken: tokenData.refreshToken ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar',
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

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          
          // Handle standardized API response
          const responseData = data.success ? data.data : data

          if (responseData.user) {
            return {
              id: responseData.user.id,
              email: responseData.user.email,
              name: responseData.user.name,
              image: responseData.user.avatarUrl,
              accessToken: responseData.accessToken || responseData.access_token,
              refreshToken: responseData.refreshToken || responseData.refresh_token,
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
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.userId = user.id
        token.accessTokenExpires = Date.now() + (account.expires_in ? account.expires_in * 1000 : 15 * 60 * 1000) // 15 minutes default
      }

      // Credentials provider sign in
      if (user?.accessToken) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.userId = user.id
        token.accessTokenExpires = Date.now() + 15 * 60 * 1000 // 15 minutes
      }

      // Check if access token has expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to refresh it
      return await refreshAccessToken(token)
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