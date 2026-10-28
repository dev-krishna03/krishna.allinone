import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { PagesService } from './pages.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { CollabSnapshotType, PageAccessLevel } from '@prisma/client';
import { CollabTokenResponse } from '@business-os/types';

@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagesService: PagesService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'business-os-secret-key-32-chars-min!';
  }

  /**
   * Generate room collaboration token
   */
  async generateCollabToken(orgId: string, pageId: string, userId: string): Promise<CollabTokenResponse> {
    // 1. Verify user is active member of org
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('User is not an active member of this organization');
    }

    // 2. Resolve access level on page
    const accessLevel = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (!accessLevel) {
      throw new ForbiddenException('User does not have access to this document');
    }

    const roomId = `ws:${orgId}:${pageId}`;
    const expiresInSeconds = 7200; // 2 hours

    const payload = {
      sub: userId,
      orgId,
      pageId,
      roomId,
      accessLevel,
      iss: 'business-os-collab',
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: expiresInSeconds });

    // Record room join event
    await this.prisma.wsPageCollabEvent.create({
      data: {
        organizationId: orgId,
        pageId,
        userId,
        eventType: 'ROOM_JOIN',
        payload: { roomId, accessLevel },
      },
    });

    return {
      token,
      roomId,
      pageId,
      userId,
      accessLevel,
      expiresInSeconds,
    };
  }

  /**
   * Validate token and ensure user hasn't been revoked
   */
  async validateCollabAccess(token: string): Promise<{
    userId: string;
    orgId: string;
    pageId: string;
    accessLevel: PageAccessLevel;
  }> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, this.jwtSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired collaboration token');
    }

    const { sub: userId, orgId, pageId } = decoded;

    // Check member still active
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Collaborator membership in organization has been revoked');
    }

    // Re-verify current page access
    const currentAccess = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (!currentAccess) {
      throw new ForbiddenException('Collaborator access to document has been revoked');
    }

    return {
      userId,
      orgId,
      pageId,
      accessLevel: currentAccess,
    };
  }

  /**
   * Save CRDT state snapshot
   */
  async saveSnapshot(
    orgId: string,
    pageId: string,
    data: {
      snapshotType?: CollabSnapshotType;
      crdtData?: string; // hex or base64
      stateVector?: string;
      version?: number;
      clientCount?: number;
      metadata?: Record<string, any>;
    },
    userId: string,
  ) {
    const access = await this.pagesService.resolveUserAccessLevel(orgId, pageId, userId);
    if (access === PageAccessLevel.VIEWER || access === PageAccessLevel.COMMENTER) {
      throw new ForbiddenException('Read-only users cannot persist CRDT snapshots');
    }

    const crdtBuffer = data.crdtData ? Buffer.from(data.crdtData, 'base64') : null;
    const stateVectorBuffer = data.stateVector ? Buffer.from(data.stateVector, 'base64') : null;

    const snapshot = await this.prisma.wsPageCollabSnapshot.create({
      data: {
        organizationId: orgId,
        pageId,
        snapshotType: data.snapshotType || CollabSnapshotType.AUTOSAVE,
        crdtData: crdtBuffer,
        stateVector: stateVectorBuffer,
        version: data.version || 1,
        clientCount: data.clientCount || 1,
        metadata: data.metadata || {},
      },
    });

    return {
      id: snapshot.id,
      pageId: snapshot.pageId,
      version: snapshot.version,
      snapshotType: snapshot.snapshotType,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * List CRDT snapshots for a page
   */
  async listSnapshots(orgId: string, pageId: string) {
    const snapshots = await this.prisma.wsPageCollabSnapshot.findMany({
      where: { pageId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return snapshots.map((s) => ({
      id: s.id,
      snapshotType: s.snapshotType,
      version: s.version,
      clientCount: s.clientCount,
      createdAt: s.createdAt,
      crdtData: s.crdtData ? s.crdtData.toString('base64') : null,
      stateVector: s.stateVector ? s.stateVector.toString('base64') : null,
      metadata: s.metadata,
    }));
  }

  /**
   * Record presence or cursor movement event
   */
  async recordCollabEvent(
    orgId: string,
    pageId: string,
    dto: { eventType: string; cursorPosition?: any; payload?: any },
    userId: string,
  ) {
    return this.prisma.wsPageCollabEvent.create({
      data: {
        organizationId: orgId,
        pageId,
        userId,
        eventType: dto.eventType,
        cursorPosition: dto.cursorPosition,
        payload: dto.payload || {},
      },
    });
  }

  /**
   * Aggregate collaboration telemetry for Super Admin & Developer Console
   */
  async getCollabHealth() {
    const [totalSnapshots, totalEvents, activePages] = await Promise.all([
      this.prisma.wsPageCollabSnapshot.count(),
      this.prisma.wsPageCollabEvent.count(),
      this.prisma.wsPageCollabEvent.groupBy({
        by: ['pageId'],
        where: {
          createdAt: { gte: new Date(Date.now() - 3600 * 1000) }, // past 1 hr
        },
      }),
    ]);

    const recentEvents = await this.prisma.wsPageCollabEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pageId: true,
        eventType: true,
        createdAt: true,
      },
    });

    return {
      status: 'HEALTHY',
      totalSnapshots,
      totalEvents,
      activeRoomsPastHour: activePages.length,
      recentEvents,
      crdtProvider: 'Yjs/Hocuspocus compatible WebSocket server',
    };
  }
}
