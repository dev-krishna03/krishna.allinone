import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { BillingService } from './billing.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { PrismaService } from '../../platform/database/prisma.service';

@Controller('admin/billing')
@UseGuards(AuthGuard)
export class SuperAdminBillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('overview')
  async getOverview() {
    return this.billingService.getSuperAdminBillingMetrics();
  }

  @Get('invoices')
  async listInvoices(@Query('status') status?: any) {
    return this.prisma.saaSInvoice.findMany({
      where: status ? { status } : undefined,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('payments')
  async listPayments(@Query('status') status?: any) {
    return this.prisma.saaSPayment.findMany({
      where: status ? { status } : undefined,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        invoice: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('webhook-events')
  async listWebhookEvents(@Query('provider') provider?: string) {
    return this.webhookProcessor.listWebhookEvents(provider);
  }

  @Post('webhook-events/:id/retry')
  async retryWebhookEvent(@Param('id') eventId: string) {
    return this.webhookProcessor.retryWebhookEvent(eventId);
  }
}
