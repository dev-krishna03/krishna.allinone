import { Controller, Post, Body, Req, Ip, HttpCode, HttpStatus } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Public Enquiries')
@Controller('public')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post('demo-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a marketing demo or contact request' })
  @ApiResponse({ status: 201, description: 'Demo request received and queued' })
  async createDemoRequest(@Body() dto: CreateEnquiryDto, @Ip() ip: string) {
    return this.enquiriesService.createEnquiry(dto, ip);
  }
}
