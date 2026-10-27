import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  let mockOutbox: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      identityUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      identityCredentials: {
        create: jest.fn(),
        update: jest.fn(),
      },
      identitySession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      identityRefreshToken: {
        create: jest.fn(),
        update: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      identitySecurityEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockJwt = {
      signAccessToken: jest.fn().mockReturnValue('mock.access.token'),
    };
    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    mockAudit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new AuthService(mockPrisma, mockJwt, mockOutbox, mockAudit);
  });

  describe('signUp', () => {
    it('should create user, credentials, and verification token in a transaction', async () => {
      mockPrisma.identityUser.findUnique.mockResolvedValue(null);
      mockPrisma.identityUser.create.mockResolvedValue({
        id: 'usr-1',
        email: 'newuser@corp.com',
        fullName: 'New User',
        isEmailVerified: false,
      });

      const res = await service.signUp({
        email: 'newuser@corp.com',
        password: 'Password123!',
        fullName: 'New User',
      });

      expect(res.user.id).toBe('usr-1');
      expect(mockPrisma.identityCredentials.create).toHaveBeenCalled();
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'identity.user.signup' })
      );
    });

    it('should reject signup if email is already registered', async () => {
      mockPrisma.identityUser.findUnique.mockResolvedValue({ id: 'existing-usr' });

      await expect(
        service.signUp({
          email: 'existing@corp.com',
          password: 'Password123!',
          fullName: 'Existing User',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should verify password, create session, and issue access + refresh tokens', async () => {
      const hashed = await bcrypt.hash('Secret123!', 8);
      mockPrisma.identityUser.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'alex@acme.inc',
        fullName: 'Alex Mercer',
        status: 'ACTIVE',
        isEmailVerified: true,
        credentials: { passwordHash: hashed },
        memberships: [{ organization: { id: 'org-1', name: 'Acme' }, status: 'ACTIVE', role: 'OWNER' }],
      });
      mockPrisma.identitySession.create.mockResolvedValue({ id: 'sess-1' });

      const result = await service.login({ email: 'alex@acme.inc', password: 'Secret123!' });

      expect(result.tokens.accessToken).toBe('mock.access.token');
      expect(result.tokens.refreshToken).toContain('sess-1:');
      expect(result.activeOrganization?.id).toBe('org-1');
    });

    it('should reject login on invalid password', async () => {
      const hashed = await bcrypt.hash('CorrectPass123!', 8);
      mockPrisma.identityUser.findUnique.mockResolvedValue({
        id: 'usr-1',
        email: 'alex@acme.inc',
        status: 'ACTIVE',
        credentials: { passwordHash: hashed },
        memberships: [],
      });

      await expect(
        service.login({ email: 'alex@acme.inc', password: 'WrongPassword' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh token & replay detection', () => {
    it('should detect token reuse and revoke the entire session', async () => {
      const rawToken = 'stolen-refresh-token';
      const tokenHash = await bcrypt.hash(rawToken, 8);

      mockPrisma.identitySession.findUnique.mockResolvedValue({
        id: 'sess-1',
        userId: 'usr-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: { id: 'usr-1', email: 'alex@acme.inc', memberships: [] },
        refreshTokens: [
          {
            id: 'rt-1',
            sessionId: 'sess-1',
            tokenHash,
            familyId: 'family-1',
            isUsed: true, // ALREADY USED
          },
        ],
      });

      await expect(
        service.refresh(`sess-1:${rawToken}`)
      ).rejects.toThrow(UnauthorizedException);

      // Verify the session was revoked due to replay attack
      expect(mockPrisma.identitySession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-1' },
          data: { revokedAt: expect.any(Date) },
        })
      );
    });
  });

  describe('password reset', () => {
    it('should issue single-use reset token without revealing if email exists', async () => {
      mockPrisma.identityUser.findUnique.mockResolvedValue({ id: 'usr-1', email: 'test@corp.com' });

      const res = await service.requestPasswordReset('test@corp.com');
      expect(res.message).toContain('password reset link has been dispatched');
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should reject reset confirmation with expired or already used token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'used-token',
        usedAt: new Date(), // Already used
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.resetPassword({ token: 'used-token', newPassword: 'NewPassword123!' })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
