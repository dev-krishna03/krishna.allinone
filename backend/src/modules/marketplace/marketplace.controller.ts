import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App & Integration Marketplace')
@Controller()
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('marketplace/listings')
  @ApiOperation({ summary: 'List published marketplace applications and connectors' })
  async listListings(
    @Query('category') category?: string,
    @Headers('x-organization-id') orgId?: string,
  ) {
    return this.marketplaceService.listListings(category, orgId);
  }

  @Get('marketplace/listings/:slug')
  @ApiOperation({ summary: 'Get details for a marketplace application by slug' })
  async getListing(
    @Param('slug') slug: string,
    @Headers('x-organization-id') orgId?: string,
  ) {
    return this.marketplaceService.getListing(slug, orgId);
  }

  @Post('organizations/:orgId/marketplace/install/:slug')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Install a marketplace application for an organization' })
  async installApp(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Request() req: any,
  ) {
    return this.marketplaceService.installListing(orgId, slug, req.user?.id);
  }
}
