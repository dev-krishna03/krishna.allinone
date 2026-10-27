import { Controller, Get, Headers } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Identity')
@Controller('me')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'Get current authenticated user and organization context' })
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant organization ID' })
  async getMe(@Headers('x-organization-id') orgId?: string) {
    return this.identityService.getCurrentUserContext(orgId);
  }
}
