import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { OutboxModule } from '../../platform/outbox/outbox.module';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [RolesController, TeamsController],
  providers: [RolesService, TeamsService],
  exports: [RolesService, TeamsService],
})
export class RolesTeamsModule {}
