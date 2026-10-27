import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogCommercialService } from './catalog-commercial.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateFeatureDto,
  CreatePlanDto,
  CreateBundleDto,
} from './dto/catalog.dto';

@Controller()
export class PlatformCatalogController {
  constructor(private readonly catalogService: CatalogCommercialService) {}

  @Get(['catalog/products', 'platform/products'])
  async listProducts(@Query('status') status?: any) {
    return this.catalogService.listProducts(status);
  }

  @Get('platform/products/:idOrSlug')
  async getProduct(@Param('idOrSlug') idOrSlug: string) {
    return this.catalogService.getProduct(idOrSlug);
  }

  @Post('platform/products')
  @UseGuards(AuthGuard)
  async createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Put('platform/products/:id')
  @UseGuards(AuthGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Post('platform/products/:id/features')
  @UseGuards(AuthGuard)
  async addFeature(
    @Param('id') id: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.catalogService.addProductFeature(id, dto);
  }

  @Get('platform/plans')
  async listPlans(
    @Query('productId') productId?: string,
    @Query('edition') edition?: any,
  ) {
    return this.catalogService.listPlans(productId, edition);
  }

  @Post('platform/plans')
  @UseGuards(AuthGuard)
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.catalogService.createPlan(dto);
  }

  @Post('platform/plans/:id/publish')
  @UseGuards(AuthGuard)
  async publishPlan(@Param('id') id: string) {
    return this.catalogService.publishPlan(id);
  }

  @Get('platform/bundles')
  async listBundles() {
    return this.catalogService.listBundles();
  }

  @Post('platform/bundles')
  @UseGuards(AuthGuard)
  async createBundle(@Body() dto: CreateBundleDto) {
    return this.catalogService.createBundle(dto);
  }
}
