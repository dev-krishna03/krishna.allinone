import { Controller, Get, Param } from '@nestjs/common';
import { PagesService } from './pages.service';

@Controller('public/pages')
export class PublicPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(':publishedSlug')
  async getPublicPage(@Param('publishedSlug') publishedSlug: string) {
    return this.pagesService.getPublicPage(publishedSlug);
  }
}
