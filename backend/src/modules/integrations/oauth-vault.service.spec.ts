import { Test, TestingModule } from '@nestjs/testing';
import { OAuthVaultService } from './oauth-vault.service';
import { TokenEncryptionService } from './crypto/token-encryption.service';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { BadRequestException } from '@nestjs/common';

describe('OAuthVaultService & TokenEncryptionService', () => {
  let vaultService: OAuthVaultService;
  let encryptionService: TokenEncryptionService;
  let prismaMock: any;
  let outboxMock: any;

  beforeEach(async () => {
    prismaMock = {
      connectorProvider: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      oAuthState: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      connectorInstallation: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      connectorCredential: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    outboxMock = {
      publish: jest.fn().mockResolvedValue({ id: 'outbox_1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthVaultService,
        TokenEncryptionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: outboxMock },
      ],
    }).compile();

    vaultService = module.get<OAuthVaultService>(OAuthVaultService);
    encryptionService = module.get<TokenEncryptionService>(TokenEncryptionService);
  });

  describe('TokenEncryptionService', () => {
    it('1. Encrypts and decrypts OAuth tokens using AES-256-GCM authenticated cipher', () => {
      const rawSecret = 'oauth_refresh_token_very_secret_xyz123';
      const encrypted = encryptionService.encrypt(rawSecret);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.ciphertext).not.toEqual(rawSecret);

      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
      );
      expect(decrypted).toEqual(rawSecret);
    });

    it('2. Redacts sensitive tokens from application logs', () => {
      expect(encryptionService.redact('gho_16characterstokenhere')).toBe('gho_...here');
      expect(encryptionService.redact(null)).toBe('[EMPTY]');
    });
  });

  describe('OAuthFlow & State Validation', () => {
    it('3. Generates CSRF state and authorization URL during initiateOAuthConnect', async () => {
      prismaMock.connectorProvider.findUnique.mockResolvedValue({
        id: 'prov_slack_1',
        slug: 'slack',
        clientId: 'slack_client_id_test',
        authUrl: 'https://slack.com/oauth/v2/authorize',
        scopesSupported: ['chat:write', 'channels:read'],
      });

      prismaMock.oAuthState.create.mockResolvedValue({ id: 'state_1' });

      const result = await vaultService.initiateOAuthConnect(
        'org_1',
        'user_1',
        'slack',
      );

      expect(result.state).toBeDefined();
      expect(result.authUrl).toContain('https://slack.com/oauth/v2/authorize');
      expect(result.authUrl).toContain('slack_client_id_test');
      expect(prismaMock.oAuthState.create).toHaveBeenCalled();
    });

    it('4. Rejects callback if state is expired or already consumed', async () => {
      prismaMock.oAuthState.findUnique.mockResolvedValue({
        id: 'state_old',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
        usedAt: null,
      });

      await expect(
        vaultService.handleOAuthCallback('slack', 'mock_code', 'state_old_token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. Successfully handles OAuth callback, encrypts tokens, and emits outbox event', async () => {
      prismaMock.oAuthState.findUnique.mockResolvedValue({
        id: 'state_valid',
        expiresAt: new Date(Date.now() + 600000),
        usedAt: null,
        organizationId: 'org_1',
        userId: 'user_1',
        provider: {
          id: 'prov_slack_1',
          slug: 'slack',
          scopesSupported: ['chat:write'],
        },
        organization: { slug: 'acme' },
      });

      prismaMock.oAuthState.update.mockResolvedValue({ id: 'state_valid' });
      prismaMock.connectorInstallation.upsert.mockResolvedValue({
        id: 'inst_1',
        status: 'CONNECTED',
      });
      prismaMock.connectorCredential.upsert.mockResolvedValue({ id: 'cred_1' });

      const res = await vaultService.handleOAuthCallback(
        'slack',
        'auth_code_123',
        'state_token_123',
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('CONNECTED');
      expect(outboxMock.publish).toHaveBeenCalledWith(
        'integration.installed',
        'ConnectorInstallation',
        'inst_1',
        expect.objectContaining({ organizationId: 'org_1', providerSlug: 'slack' }),
      );
    });
  });
});
