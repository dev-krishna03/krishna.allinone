import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../platform/database/database.module';
import { OutboxModule } from '../../platform/outbox/outbox.module';
import { AuthModule } from '../../platform/auth/auth.module';
import { WorkspaceService } from './workspace.service';
import { PagesService } from './pages.service';
import { BlocksService } from './blocks.service';
import { RevisionsService } from './revisions.service';
import { CommentsService } from './comments.service';
import { CollabService } from './collab.service';
import { WorkspaceController } from './workspace.controller';
import { PublicPagesController } from './public-pages.controller';

@Module({
  imports: [ConfigModule, DatabaseModule, OutboxModule, AuthModule],
  controllers: [WorkspaceController, PublicPagesController],
  providers: [
    WorkspaceService,
    PagesService,
    BlocksService,
    RevisionsService,
    CommentsService,
    CollabService,
  ],
  exports: [
    WorkspaceService,
    PagesService,
    BlocksService,
    RevisionsService,
    CommentsService,
    CollabService,
  ],
})
export class WorkspaceModule {}
