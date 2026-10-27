import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from '@business-os/types';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, TenantGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('teams')
  async listTeams(@Param('orgId') orgId: string) {
    return this.teamsService.listTeams(orgId);
  }

  @Post('teams')
  async createTeam(
    @Param('orgId') orgId: string,
    @Body() dto: CreateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.createTeam(orgId, dto, req.user?.id);
  }

  @Get('teams/:teamId')
  async getTeam(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.getTeam(orgId, teamId);
  }

  @Put('teams/:teamId')
  async updateTeam(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.updateTeam(orgId, teamId, dto, req.user?.id);
  }

  @Delete('teams/:teamId')
  async deleteTeam(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.teamsService.deleteTeam(orgId, teamId, req.user?.id);
  }

  @Post('teams/:teamId/members')
  async addTeamMember(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.teamsService.addTeamMember(orgId, teamId, memberId, req.user?.id);
  }

  @Delete('teams/:teamId/members/:memberId')
  async removeTeamMember(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.teamsService.removeTeamMember(orgId, teamId, memberId, req.user?.id);
  }
}
