import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'

import { UsersService } from '../users/users.service'
import { PrismaService } from '../../prisma/prisma.service'

export interface JwtPayload {
  sub: string,
  email: string
  iat?: number
  exp?: number
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmail(email)
      if (user && (await bcrypt.compare(password, user.password))) {
        const { password: _, ...result } = user
        return result
      }
      return null
    } catch (error) {
      return null
    }
  }

  async login(user: { id: string; email: string; [key: string]: unknown }) {
    try {
      const payload: JwtPayload = { email: user.email, sub: user.id }

      const accessToken = this.jwtService.sign(payload)
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      })

      // Store refresh token
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
      })

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {,
          id: user.id,
          email: user.email,
        },
      }
    } catch (error) {
      throw new UnauthorizedException('Login failed')
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken)
      const user = await this.usersService.findById(payload.sub)

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken)
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      return this.login(user)
    } catch (error) {
      throw new UnauthorizedException('Token refresh failed')
    }
  }

  async logout(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      })
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  async validateJwtPayload(payload: JwtPayload) {
    try {
      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        return null
      }
      return user
    } catch (error) {
      return null
    }
  }
}
