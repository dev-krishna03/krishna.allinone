import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WebhooksGovernanceService } from './webhooks-governance.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from './dto/webhook.dto';

@ApiTags('Outbound Webhooks Governance')
@Controller('organizations/:orgId/webhooks')
@UseGuards(AuthGuard, TenantGuard)
export class WebhooksGovernanceController {
  constructor(
    private readonly webhooksService: WebhooksGovernanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organization outbound webhook subscriptions' })
  async listSubscriptions(@Param('orgId') orgId: string) {
    return this.webhooksService.listSubscriptions(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Register an outbound webhook subscription with HMAC signing' })
  async createSubscription(
    @Param('orgId') orgId: string,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    return this.webhooksService.createSubscription(orgId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an outbound webhook subscription' })
  async updateSubscription(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    return this.webhooksService.updateSubscription(orgId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an outbound webhook subscription' })
  async deleteSubscription(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.deleteSubscription(orgId, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send signed test ping to webhook endpoint and record delivery' })
  async testSubscription(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.testSubscription(orgId, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List recent delivery logs and response telemetry for a subscription' })
  async listDeliveries(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.listDeliveries(orgId, id);
  }
}
