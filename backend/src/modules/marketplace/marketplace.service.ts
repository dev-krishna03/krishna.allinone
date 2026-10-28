import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { MarketplacePricingType, MarketplaceReviewStatus, ConnectorInstallationStatus } from '@prisma/client';

@Injectable()
export class MarketplaceService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultListings();
  }

  async seedDefaultListings() {
    const listings = [
      {
        slug: 'crm-suite',
        name: 'CRM & Pipeline Hub',
        category: 'Sales & Marketing',
        shortDescription: 'Manage high-velocity sales pipelines, track customer relationships, and close enterprise deals.',
        longDescription: 'Comprehensive customer relationship management tailored for modern sales teams. Features lead scoring, deal velocity tracking, activity audit trails, and multi-currency quotes.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/salesforce/salesforce-original.svg',
        developerName: 'Business OS Native',
        version: '2.1.0',
        pricingType: MarketplacePricingType.INCLUDED,
        priceAmount: 0,
        requiredScopes: ['crm:read', 'crm:write', 'contacts:manage'],
        capabilities: ['Deal Pipelines', 'Contact Enrichment', 'Email Sequences', 'Custom Stages'],
        isFeatured: true,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        slug: 'finance-invoicing',
        name: 'Finance & Invoicing Engine',
        category: 'Finance',
        shortDescription: 'Automate accounting, recurring customer subscriptions, tax calculations, and payment collection.',
        longDescription: 'Platform-grade financial management with double-entry ledger safety, multi-currency support, automated overdue reminders, and payment gateway webhooks.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/confluence/confluence-original.svg',
        developerName: 'Business OS Native',
        version: '1.8.0',
        pricingType: MarketplacePricingType.INCLUDED,
        priceAmount: 0,
        requiredScopes: ['finance:read', 'finance:write', 'invoices:manage'],
        capabilities: ['Automated Invoicing', 'Payment Gateway Sync', 'Tax Calculation', 'Dunning Engine'],
        isFeatured: true,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        slug: 'slack-connector',
        name: 'Slack Collaboration Suite',
        category: 'Communication',
        shortDescription: 'Stream real-time transactional alerts, approval requests, and outbox logs to Slack channels.',
        longDescription: 'Connect your corporate Slack workspace to Business OS. Receive instant channel alerts for closed sales deals, past-due billing, security incident declarations, and team invites.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg',
        developerName: 'Slack Technologies',
        version: '1.4.2',
        pricingType: MarketplacePricingType.FREE,
        priceAmount: 0,
        requiredScopes: ['chat:write', 'channels:read'],
        capabilities: ['Channel Alerts', 'Slash Commands', 'Incident Broadcasts', 'Deal Notifications'],
        isFeatured: false,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        slug: 'google-workspace-sync',
        name: 'Google Workspace Sync',
        category: 'Productivity',
        shortDescription: 'Sync Google Calendar events, Gmail threads, Google Drive proposals, and Google Contacts.',
        longDescription: 'Full bi-directional synchronization with Google Workspace. Schedule customer demo meetings, attach proposal PDFs directly from Google Drive, and sync corporate contact directories.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg',
        developerName: 'Google LLC',
        version: '2.0.0',
        pricingType: MarketplacePricingType.FREE,
        priceAmount: 0,
        requiredScopes: ['calendar:sync', 'drive:read', 'contacts:read'],
        capabilities: ['Calendar Sync', 'Drive Attachments', 'Meeting Scheduler', 'Gmail Sync'],
        isFeatured: false,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        slug: 'github-dev-sync',
        name: 'GitHub Developer Pipeline',
        category: 'Developer Tools',
        shortDescription: 'Link GitHub pull requests, security alerts, and CI/CD deployment pipelines to project tasks.',
        longDescription: 'Connect repository events and git commit history to internal agile tasks. Automate status transitions upon pull request merge and monitor deployment runtimes.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
        developerName: 'GitHub Inc.',
        version: '1.2.5',
        pricingType: MarketplacePricingType.FREE,
        priceAmount: 0,
        requiredScopes: ['repo:read', 'workflow:read'],
        capabilities: ['PR Linking', 'Deployment Tracking', 'Commit History', 'Issue Synchronization'],
        isFeatured: false,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        slug: 'whatsapp-business',
        name: 'WhatsApp Business Messaging',
        category: 'Communication',
        shortDescription: 'Send automated invoice payment reminders and customer support notifications over WhatsApp.',
        longDescription: 'Enterprise WhatsApp Cloud API integration. Send high-deliverability templated payment receipts, two-factor authentication alerts, and direct customer support replies.',
        iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg',
        developerName: 'Meta Platforms',
        version: '1.1.0',
        pricingType: MarketplacePricingType.PAID_ADDON,
        priceAmount: 19,
        requiredScopes: ['messages:send', 'templates:manage'],
        capabilities: ['Template Messaging', 'Payment Receipts', 'Support Chat', 'OTP Delivery'],
        isFeatured: false,
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    ];

    for (const listing of listings) {
      await this.prisma.marketplaceListing.upsert({
        where: { slug: listing.slug },
        create: listing,
        update: {
          name: listing.name,
          category: listing.category,
          shortDescription: listing.shortDescription,
          longDescription: listing.longDescription,
          capabilities: listing.capabilities,
          requiredScopes: listing.requiredScopes,
          priceAmount: listing.priceAmount,
        },
      });
    }

    this.logger.log(`Initialized ${listings.length} standard marketplace listings`);
  }

  async listListings(category?: string, organizationId?: string) {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        reviewStatus: MarketplaceReviewStatus.PUBLISHED,
        category: category ? { contains: category, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ isFeatured: 'desc' }, { installCount: 'desc' }],
    });

    if (!organizationId) {
      return listings.map((l) => ({ ...l, isInstalled: false }));
    }

    // Check connector installations for current org
    const installations = await this.prisma.connectorInstallation.findMany({
      where: {
        organizationId,
        status: ConnectorInstallationStatus.CONNECTED,
      },
      include: { provider: true },
    });

    const installedSlugs = new Set(installations.map((i) => i.provider.slug));

    return listings.map((l) => ({
      ...l,
      isInstalled: installedSlugs.has(l.slug) || l.pricingType === MarketplacePricingType.INCLUDED,
    }));
  }

  async getListing(slug: string, organizationId?: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { slug },
    });

    if (!listing) {
      throw new NotFoundException(`Marketplace listing '${slug}' not found`);
    }

    let isInstalled = false;
    if (organizationId) {
      const installation = await this.prisma.connectorInstallation.findFirst({
        where: {
          organizationId,
          status: ConnectorInstallationStatus.CONNECTED,
          provider: { slug },
        },
      });
      isInstalled = !!installation || listing.pricingType === MarketplacePricingType.INCLUDED;
    }

    return {
      ...listing,
      isInstalled,
    };
  }

  async installListing(organizationId: string, slug: string, userId?: string) {
    const listing = await this.getListing(slug);

    // Increment installation count
    await this.prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { installCount: { increment: 1 } },
    });

    // Check if matching connector provider exists
    const provider = await this.prisma.connectorProvider.findUnique({
      where: { slug },
    });

    let installation = null;
    if (provider) {
      installation = await this.prisma.connectorInstallation.upsert({
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
          scopesGranted: listing.requiredScopes,
          lastSyncAt: new Date(),
        },
        update: {
          status: ConnectorInstallationStatus.CONNECTED,
          lastSyncAt: new Date(),
        },
      });
    }

    // Outbox domain event
    await this.outbox.publish(
      'marketplace.app.installed',
      'MarketplaceListing',
      listing.id,
      {
        organizationId,
        listingId: listing.id,
        slug: listing.slug,
        userId,
      },
    );

    return {
      success: true,
      slug: listing.slug,
      isInstalled: true,
      installation,
    };
  }
}
