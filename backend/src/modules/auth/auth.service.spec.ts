import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUsersService = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updateLastActive: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'mock-refresh-token',
      });
      mockConfigService.get.mockReturnValue('15m');

      const result = await service.generateTokens(user);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900, // 15 minutes in seconds
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        name: user.name,
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userId = 'non-existent-user';

      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.validateUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate and return user for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockTokenRecord = {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        revokedAt: null,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);

      const result = await service.validateRefreshToken(refreshToken);

      expect(result).toEqual(mockTokenRecord.user);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const refreshToken = 'expired-refresh-token';
      const mockTokenRecord = {
        token: refreshToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        revokedAt: null,
        user: { id: 'user-1' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      await expect(service.validateRefreshToken(refreshToken)).rejects.toThrow('Refresh token expired');
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const refreshToken = 'revoked-refresh-token';
      const mockTokenRecord = {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
        user: { id: 'user-1' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);

      await expect(service.validateRefreshToken(refreshToken)).rejects.toThrow('Refresh token revoked');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired and revoked tokens', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredTokens();

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { revokedAt: { not: null } },
          ],
        },
      });
    });
  });
});