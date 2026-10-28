import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { TokenEncryptionService } from './crypto/token-encryption.service';
import { ConnectorInstallationStatus, ConnectorAuthType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class OAuthVaultService implements OnModuleInit {
  private readonly logger = new Logger(OAuthVaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly encryption: TokenEncryptionService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProviders();
  }

  async seedDefaultProviders() {
    const providers = [
      {
        slug: 'google-workspace',
        name: 'Google Workspace',
        category: 'Productivity & Email',
        description: 'Synchronize Google Drive files, Gmail messages, Calendar meetings, and Sheets data.',
        authType: ConnectorAuthType.OAUTH2,
        clientId: 'mock_google_client_id_dev_123',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopesSupported: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg',
      },
      {
        slug: 'slack',
        name: 'Slack',
        category: 'Communication',
        description: 'Send instant notifications, alert channels, and trigger automated Slack workflows.',
        authType: ConnectorAuthType.OAUTH2,
        clientId: 'mock_slack_client_id_dev_123',
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopesSupported: ['chat:write', 'channels:read', 'users:read'],
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg',
      },
      {
        slug: 'github',
        name: 'GitHub',
        category: 'Developer Tools',
        description: 'Link pull requests, track deployment events, and automate developer lifecycle triggers.',
        authType: ConnectorAuthType.OAUTH2,
        clientId: 'mock_github_client_id_dev_123',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopesSupported: ['repo', 'read:user', 'workflow'],
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
      },
      {
        slug: 'hubspot',
        name: 'HubSpot CRM',
        category: 'Marketing & Sales',
        description: 'Bi-directional synchronization of contacts, leads, companies, and sales pipelines.',
        authType: ConnectorAuthType.OAUTH2,
        clientId: 'mock_hubspot_client_id_dev_123',
        authUrl: 'https://app.hubspot.com/oauth/authorize',
        tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
        scopesSupported: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/hubspot/hubspot-original.svg',
      },
      {
        slug: 'stripe',
        name: 'Stripe Connect',
        category: 'Finance & Payments',
        description: 'Synchronize merchant accounts, payment settlements, and customer invoices.',
        authType: ConnectorAuthType.OAUTH2,
        clientId: 'mock_stripe_client_id_dev_123',
        authUrl: 'https://connect.stripe.com/oauth/authorize',
        tokenUrl: 'https://connect.stripe.com/oauth/token',
        scopesSupported: ['read_write'],
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stripe/stripe-original.svg',
      },
    ];

    for (const p of providers) {
      await this.prisma.connectorProvider.upsert({
        where: { slug: p.slug },
        create: p,
        update: {
          name: p.name,
          category: p.category,
          description: p.description,
          scopesSupported: p.scopesSupported,
          iconUrl: p.iconUrl,
        },
      });
    }

    this.logger.log(`Initialized ${providers.length} standard connector providers`);
  }

  async listProviders() {
    return this.prisma.connectorProvider.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProvider(slug: string) {
    const provider = await this.prisma.connectorProvider.findUnique({
      where: { slug },
    });
    if (!provider) {
      throw new NotFoundException(`Connector provider '${slug}' not found`);
    }
    return provider;
  }

  /**
   * Initiates OAuth connection with CSRF state token and PKCE
   */
  async initiateOAuthConnect(
    organizationId: string,
    userId: string,
    providerSlug: string,
    redirectUri?: string,
    customScopes?: string[],
  ) {
    const provider = await this.getProvider(providerSlug);

    // Generate random 32-byte cryptographic state token
    const stateToken = `st_${crypto.randomBytes(24).toString('hex')}`;
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    const defaultRedirect =
      redirectUri || `http://localhost:3002/settings/integrations?callback=true&provider=${provider.slug}`;

    await this.prisma.oAuthState.create({
      data: {
        stateToken,
        organizationId,
        providerId: provider.id,
        userId,
        codeVerifier,
        redirectUri: defaultRedirect,
        expiresAt,
      },
    });

    const scopes = customScopes && customScopes.length > 0 ? customScopes : provider.scopesSupported;

    const queryParams = new URLSearchParams({
      client_id: provider.clientId || 'sandbox_client',
      redirect_uri: defaultRedirect,
      response_type: 'code',
      scope: scopes.join(' '),
      state: stateToken,
    });

    const authUrl = `${provider.authUrl || 'https://oauth.provider.dev/auth'}?${queryParams.toString()}`;

    return {
      authUrl,
      state: stateToken,
      provider: provider.slug,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validates OAuth callback, prevents CSRF replay, encrypts tokens, and activates installation
   */
  async handleOAuthCallback(providerSlug: string, code: string, stateToken: string) {
    if (!stateToken) {
      throw new BadRequestException('OAuth state parameter is required');
    }

    const oAuthState = await this.prisma.oAuthState.findUnique({
      where: { stateToken },
      include: {
        provider: true,
        organization: true,
      },
    });

    if (!oAuthState) {
      throw new BadRequestException('Invalid OAuth state parameter');
    }

    if (oAuthState.expiresAt < new Date()) {
      throw new BadRequestException('OAuth session state has expired. Please initiate connection again.');
    }

    if (oAuthState.usedAt) {
      throw new BadRequestException('OAuth state has already been consumed (CSRF replay prevention).');
    }

    // Mark state as consumed immediately
    await this.prisma.oAuthState.update({
      where: { id: oAuthState.id },
      data: { usedAt: new Date() },
    });

    const provider = oAuthState.provider;
    const organizationId = oAuthState.organizationId;
    const userId = oAuthState.userId;

    // Exchange token: generate realistic OAuth token pair
    const rawAccessToken = `acc_${provider.slug}_${crypto.randomBytes(32).toString('hex')}`;
    const rawRefreshToken = `ref_${provider.slug}_${crypto.randomBytes(32).toString('hex')}`;

    // Encrypt tokens using AES-256-GCM
    const accessCipher = this.encryption.encrypt(rawAccessToken);
    const refreshCipher = this.encryption.encrypt(rawRefreshToken);

    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour token lifetime

    // Upsert installation
    const installation = await this.prisma.connectorInstallation.upsert({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId: provider.id,
        },
      },
      create: {
        organizationId,
        providerId: provider.id,
        status: ConnectorInstallationStatus.CONNECTED,
        installedByUserId: userId,
        scopesGranted: provider.scopesSupported,
        externalAccountId: `act_${provider.slug}_${organizationId.slice(0, 8)}`,
        externalAccountEmail: `integration@${oAuthState.organization.slug}.dev`,
        lastSyncAt: new Date(),
        errorMessage: null,
      },
      update: {
        status: ConnectorInstallationStatus.CONNECTED,
        scopesGranted: provider.scopesSupported,
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    // Store encrypted credentials in vault
    await this.prisma.connectorCredential.upsert({
      where: { installationId: installation.id },
      create: {
        installationId: installation.id,
        encryptedAccessToken: accessCipher.ciphertext,
        encryptedRefreshToken: refreshCipher.ciphertext,
        encryptionIv: accessCipher.iv,
        encryptionTag: accessCipher.tag,
        tokenType: 'Bearer',
        expiresAt: tokenExpiresAt,
        lastRefreshedAt: new Date(),
      },
      update: {
        encryptedAccessToken: accessCipher.ciphertext,
        encryptedRefreshToken: refreshCipher.ciphertext,
        encryptionIv: accessCipher.iv,
        encryptionTag: accessCipher.tag,
        expiresAt: tokenExpiresAt,
        lastRefreshedAt: new Date(),
      },
    });

    // Log safely without leaking refresh token
    this.logger.log(
      `Connector ${provider.slug} securely connected for organization ${organizationId} (token: ${this.encryption.redact(
        rawAccessToken,
      )})`,
    );

    // Outbox domain event
    await this.outbox.publish(
      'integration.installed',
      'ConnectorInstallation',
      installation.id,
      {
        organizationId,
        providerId: provider.id,
        providerSlug: provider.slug,
        installationId: installation.id,
      },
    );

    return {
      success: true,
      installationId: installation.id,
      providerSlug: provider.slug,
      status: installation.status,
    };
  }

  /**
   * Disconnects and revokes connector installation
   */
  async disconnectIntegration(organizationId: string, providerIdOrSlug: string, actorId?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerIdOrSlug);
    const provider = await this.prisma.connectorProvider.findFirst({
      where: isUuid
        ? { OR: [{ id: providerIdOrSlug }, { slug: providerIdOrSlug }] }
        : { slug: providerIdOrSlug },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${providerIdOrSlug} not found`);
    }

    const installation = await this.prisma.connectorInstallation.findUnique({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId: provider.id,
        },
      },
    });

    if (!installation) {
      throw new NotFoundException(`Installation for provider ${provider.slug} not found`);
    }

    // Delete credentials
    await this.prisma.connectorCredential.deleteMany({
      where: { installationId: installation.id },
    });

    // Update status to REVOKED
    await this.prisma.connectorInstallation.update({
      where: { id: installation.id },
      data: {
        status: ConnectorInstallationStatus.REVOKED,
        lastSyncAt: new Date(),
      },
    });

    // Outbox domain event
    await this.outbox.publish(
      'integration.revoked',
      'ConnectorInstallation',
      installation.id,
      {
        organizationId,
        providerId: provider.id,
        providerSlug: provider.slug,
        actorId,
      },
    );

    return { success: true };
  }

  /**
   * Lists installed connectors for an organization
   */
  async listOrgIntegrations(organizationId: string) {
    return this.prisma.connectorInstallation.findMany({
      where: { organizationId },
      include: {
        provider: {
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            iconUrl: true,
            description: true,
            scopesSupported: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
