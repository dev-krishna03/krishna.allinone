import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../platform/auth/guards/auth.guard';
import { TenantGuard } from '../../platform/auth/guards/tenant.guard';
import { WorkspaceService } from './workspace.service';
import { PagesService } from './pages.service';
import { BlocksService } from './blocks.service';
import { RevisionsService } from './revisions.service';
import { CommentsService } from './comments.service';
import { CollabService } from './collab.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreatePageDto,
  UpdatePageDto,
  MovePageDto,
  DuplicatePageDto,
  PublishPageDto,
  CreateBlockDto,
  UpdateBlockDto,
  ReorderBlocksDto,
  CreateRevisionDto,
  RevertRevisionDto,
  CreatePermissionDto,
  CreateCommentDto,
} from '@business-os/types';

@Controller('organizations/:orgId/workspace')
@UseGuards(AuthGuard, TenantGuard)
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly pagesService: PagesService,
    private readonly blocksService: BlocksService,
    private readonly revisionsService: RevisionsService,
    private readonly commentsService: CommentsService,
    private readonly collabService: CollabService,
  ) {}

  // ----------------------------------------------------
  // WORKSPACES
  // ----------------------------------------------------

  @Get()
  async listWorkspaces(@Param('orgId') orgId: string) {
    return this.workspaceService.listWorkspaces(orgId);
  }

  @Post()
  async createWorkspace(
    @Param('orgId') orgId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.createWorkspace(orgId, dto);
  }

  // ----------------------------------------------------
  // PAGES HIERARCHY & CRUD
  // ----------------------------------------------------

  @Get('pages')
  async listPages(
    @Param('orgId') orgId: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('isDeleted') isDeleted?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('templateCategory') templateCategory?: string,
    @Query('parentId') parentId?: string,
    @Request() req?: any,
  ) {
    return this.pagesService.listPages(orgId, workspaceId, {
      isDeleted: isDeleted === 'true',
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
      templateCategory,
      parentId: parentId === 'null' ? null : parentId,
      userId: req?.user?.id,
    });
  }

  @Post('pages')
  async createPage(
    @Param('orgId') orgId: string,
    @Body() dto: CreatePageDto,
    @Request() req: any,
  ) {
    return this.pagesService.createPage(orgId, dto, req.user?.id);
  }

  @Get('pages/:pageId')
  async getPage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.getPage(orgId, pageId, req.user?.id);
  }

  @Patch('pages/:pageId')
  async updatePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
    @Request() req: any,
  ) {
    return this.pagesService.updatePage(orgId, pageId, dto, req.user?.id);
  }

  @Delete('pages/:pageId')
  async softDeletePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.softDeletePage(orgId, pageId, req.user?.id);
  }

  @Delete('pages/:pageId/permanent')
  async permanentlyDeletePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.permanentlyDeletePage(orgId, pageId, req.user?.id);
  }

  @Post('pages/:pageId/restore')
  async restorePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.restorePage(orgId, pageId, req.user?.id);
  }

  @Post('pages/:pageId/move')
  async movePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: MovePageDto,
    @Request() req: any,
  ) {
    return this.pagesService.movePage(orgId, pageId, dto, req.user?.id);
  }

  @Post('pages/:pageId/duplicate')
  async duplicatePage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: DuplicatePageDto,
    @Request() req: any,
  ) {
    return this.pagesService.duplicatePage(orgId, pageId, dto, req.user?.id);
  }

  @Post('pages/:pageId/favorite')
  async toggleFavorite(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.toggleFavorite(orgId, pageId, req.user?.id);
  }

  @Post('pages/:pageId/publish')
  async publishPage(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: PublishPageDto,
    @Request() req: any,
  ) {
    return this.pagesService.publishPage(orgId, pageId, dto, req.user?.id);
  }

  // ----------------------------------------------------
  // WORKSPACE ROOTS BY ID
  // ----------------------------------------------------

  @Get(':workspaceId')
  async getWorkspace(
    @Param('orgId') orgId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaceService.getWorkspace(orgId, workspaceId);
  }

  @Patch(':workspaceId')
  async updateWorkspace(
    @Param('orgId') orgId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.updateWorkspace(orgId, workspaceId, dto);
  }

  // ----------------------------------------------------
  // BLOCKS
  // ----------------------------------------------------

  @Get('pages/:pageId/blocks')
  async listBlocks(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.blocksService.listBlocks(orgId, pageId);
  }

  @Post('pages/:pageId/blocks')
  async createBlock(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateBlockDto,
    @Request() req: any,
  ) {
    return this.blocksService.createBlock(orgId, pageId, dto, req.user?.id);
  }

  @Patch('pages/:pageId/blocks/:blockId')
  async updateBlock(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateBlockDto,
    @Request() req: any,
  ) {
    return this.blocksService.updateBlock(orgId, pageId, blockId, dto, req.user?.id);
  }

  @Delete('pages/:pageId/blocks/:blockId')
  async deleteBlock(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Request() req: any,
  ) {
    return this.blocksService.deleteBlock(orgId, pageId, blockId, req.user?.id);
  }

  @Post('pages/:pageId/blocks/reorder')
  async reorderBlocks(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: ReorderBlocksDto,
    @Request() req: any,
  ) {
    return this.blocksService.reorderBlocks(orgId, pageId, dto, req.user?.id);
  }

  // ----------------------------------------------------
  // VERSIONS & REVISIONS
  // ----------------------------------------------------

  @Get('pages/:pageId/versions')
  async listRevisions(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.revisionsService.listRevisions(orgId, pageId);
  }

  @Get('pages/:pageId/versions/:version')
  async getRevision(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('version') version: string,
  ) {
    return this.revisionsService.getRevision(orgId, pageId, parseInt(version, 10));
  }

  @Post('pages/:pageId/versions')
  async createNamedRevision(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateRevisionDto,
    @Request() req: any,
  ) {
    return this.revisionsService.createNamedRevision(orgId, pageId, dto, req.user?.id);
  }

  @Post('pages/:pageId/versions/revert')
  async revertRevision(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: RevertRevisionDto,
    @Request() req: any,
  ) {
    return this.revisionsService.revertRevision(orgId, pageId, dto.version, req.user?.id);
  }

  // ----------------------------------------------------
  // PERMISSIONS & SHARING
  // ----------------------------------------------------

  @Get('pages/:pageId/share')
  async listPermissions(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.pagesService.listPermissions(orgId, pageId, req.user?.id);
  }

  @Post('pages/:pageId/share')
  async grantPermission(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreatePermissionDto,
    @Request() req: any,
  ) {
    return this.pagesService.grantPermission(orgId, pageId, dto, req.user?.id);
  }

  @Delete('pages/:pageId/share/:permissionId')
  async revokePermission(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('permissionId') permissionId: string,
    @Request() req: any,
  ) {
    return this.pagesService.revokePermission(orgId, pageId, permissionId, req.user?.id);
  }

  // ----------------------------------------------------
  // COMMENTS & THREADS
  // ----------------------------------------------------

  @Get('pages/:pageId/comments')
  async listComments(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.commentsService.listComments(orgId, pageId);
  }

  @Post('pages/:pageId/comments')
  async createComment(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.commentsService.createComment(orgId, pageId, dto, req.user?.id);
  }

  @Patch('pages/:pageId/comments/:commentId/resolve')
  async resolveComment(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body('isResolved') isResolved: boolean,
    @Request() req: any,
  ) {
    return this.commentsService.resolveComment(orgId, pageId, commentId, req.user?.id, isResolved ?? true);
  }

  @Delete('pages/:pageId/comments/:commentId')
  async deleteComment(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.commentsService.deleteComment(orgId, pageId, commentId, req.user?.id);
  }

  // ----------------------------------------------------
  // REAL-TIME COLLABORATION
  // ----------------------------------------------------

  @Post('pages/:pageId/collab/token')
  async generateCollabToken(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Request() req: any,
  ) {
    return this.collabService.generateCollabToken(orgId, pageId, req.user?.id);
  }

  @Get('pages/:pageId/collab/snapshots')
  async listSnapshots(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.collabService.listSnapshots(orgId, pageId);
  }

  @Post('pages/:pageId/collab/snapshots')
  async saveSnapshot(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.collabService.saveSnapshot(orgId, pageId, body, req.user?.id);
  }

  @Post('pages/:pageId/collab/events')
  async recordCollabEvent(
    @Param('orgId') orgId: string,
    @Param('pageId') pageId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.collabService.recordCollabEvent(orgId, pageId, body, req.user?.id);
  }
}
