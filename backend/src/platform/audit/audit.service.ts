import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface RecordAuditParams {
  organizationId?: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  async getLogs(organizationId?: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }
}
