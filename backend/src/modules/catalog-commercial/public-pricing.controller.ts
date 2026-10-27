import { Controller, Get } from '@nestjs/common';
import { CatalogCommercialService } from './catalog-commercial.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Commercial Catalog')
@Controller('public')
export class PublicPricingController {
  constructor(private readonly catalogService: CatalogCommercialService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get published versioned SaaS plans and commercial editions' })
  async getPricing() {
    return this.catalogService.getPublicPricingSnapshot();
  }
}
