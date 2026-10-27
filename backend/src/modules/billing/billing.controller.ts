import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { BillingService } from './billing.service';
import {
  ComputeQuoteDto,
  CreateCheckoutSessionDto,
  ChangeSubscriptionDto,
  UpdatePaymentMethodDto,
} from './dto/billing.dto';

@Controller('organizations/:orgId/billing')
@UseGuards(AuthGuard, TenantGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async computeQuote(
    @Param('orgId') orgId: string,
    @Body() dto: ComputeQuoteDto,
  ) {
    return this.billingService.computeQuote(orgId, dto);
  }

  @Post('checkout')
  async createCheckout(
    @Param('orgId') orgId: string,
    @Body() dto: CreateCheckoutSessionDto,
    @Request() req: any,
  ) {
    return this.billingService.createCheckoutSession(orgId, dto, req.user?.id);
  }

  @Get('subscription')
  async getSubscription(@Param('orgId') orgId: string) {
    return this.billingService.getSubscription(orgId);
  }

  @Post('subscription/change')
  async changeSubscription(
    @Param('orgId') orgId: string,
    @Body() dto: ChangeSubscriptionDto,
    @Request() req: any,
  ) {
    return this.billingService.changeSubscription(orgId, dto, req.user?.id);
  }

  @Delete('subscription')
  async cancelSubscription(
    @Param('orgId') orgId: string,
    @Query('immediately') immediately: string,
    @Request() req: any,
  ) {
    return this.billingService.cancelSubscription(
      orgId,
      immediately === 'true',
      req.user?.id,
    );
  }

  @Get('invoices')
  async listInvoices(@Param('orgId') orgId: string) {
    return this.billingService.listInvoices(orgId);
  }

  @Get('invoices/:invoiceId')
  async getInvoice(
    @Param('orgId') orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billingService.getInvoice(orgId, invoiceId);
  }

  @Post('payment-method')
  async updatePaymentMethod(
    @Param('orgId') orgId: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.billingService.updatePaymentMethod(orgId, dto);
  }

  @Put('payment-method')
  async updatePaymentMethodPut(
    @Param('orgId') orgId: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.billingService.updatePaymentMethod(orgId, dto);
  }
}
