import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Catalog')
@Controller('public')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List active product catalog items' })
  async getProducts() {
    return this.catalogService.getActiveProducts();
  }

  @Get('pricing')
  @ApiOperation({ summary: 'List published pricing options' })
  async getPricing() {
    return this.catalogService.getPricingPlans();
  }
}
