import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { OAuthVaultService } from './oauth-vault.service';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConnectProviderDto, OAuthCallbackDto } from './dto/integration.dto';
import { Response } from 'express';

@ApiTags('Integrations & OAuth Vault')
@Controller()
export class IntegrationsController {
  constructor(private readonly oauthVault: OAuthVaultService) {}

  @Get('platform/connectors/providers')
  @ApiOperation({ summary: 'List all supported platform third-party connector providers' })
  async listProviders() {
    return this.oauthVault.listProviders();
  }

  @Get('organizations/:orgId/integrations')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List all installed connectors for an organization' })
  async listIntegrations(@Param('orgId') orgId: string) {
    return this.oauthVault.listOrgIntegrations(orgId);
  }

  @Post('integrations/:provider/connect')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Initiate OAuth authorization flow with CSRF state and PKCE' })
  async initiateConnect(
    @Param('provider') provider: string,
    @Body() dto: ConnectProviderDto,
    @Request() req: any,
  ) {
    return this.oauthVault.initiateOAuthConnect(
      dto.organizationId,
      req.user?.id,
      provider,
      dto.redirectUri,
      dto.customScopes,
    );
  }

  @Post('oauth/:provider/callback')
  @ApiOperation({ summary: 'Handle programmatic OAuth callback code exchange' })
  async handleCallbackPost(
    @Param('provider') provider: string,
    @Body() dto: OAuthCallbackDto,
  ) {
    return this.oauthVault.handleOAuthCallback(provider, dto.code || '', dto.state);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'Handle browser redirect OAuth callback' })
  async handleCallbackGet(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.oauthVault.handleOAuthCallback(provider, code, state);
      return res.redirect(`http://localhost:3002/settings/integrations?status=connected&provider=${provider}`);
    } catch (err: any) {
      return res.redirect(
        `http://localhost:3002/settings/integrations?status=error&message=${encodeURIComponent(err.message)}`,
      );
    }
  }

  @Delete('organizations/:orgId/integrations/:providerId')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Disconnect and revoke connector installation' })
  async disconnect(
    @Param('orgId') orgId: string,
    @Param('providerId') providerId: string,
    @Request() req: any,
  ) {
    return this.oauthVault.disconnectIntegration(orgId, providerId, req.user?.id);
  }
}
