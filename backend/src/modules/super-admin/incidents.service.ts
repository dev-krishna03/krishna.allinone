import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/admin.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async listIncidents(status?: IncidentStatus) {
    return this.prisma.platformIncident.findMany({
      where: status ? { status } : undefined,
      orderBy: [
        { status: 'asc' }, // OPEN, INVESTIGATING come first
        { createdAt: 'desc' },
      ],
    });
  }

  async getIncident(id: string) {
    const incident = await this.prisma.platformIncident.findUnique({
      where: { id },
    });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    return incident;
  }

  async createIncident(dto: CreateIncidentDto, declaredByUserId?: string) {
    const incidentNumber = `INC-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const initialTimeline = [
      {
        timestamp: now,
        message: `Incident declared: ${dto.title}`,
        status: IncidentStatus.OPEN,
        author: declaredByUserId || 'system',
      },
    ];

    const incident = await this.prisma.platformIncident.create({
      data: {
        incidentNumber,
        title: dto.title,
        description: dto.description,
        severity: dto.severity || IncidentSeverity.MEDIUM,
        status: IncidentStatus.OPEN,
        affectedServices: dto.affectedServices || ['core-api'],
        declaredByUserId,
        timeline: initialTimeline,
      },
    });

    await this.outbox.publish(
      'platform.incident.declared',
      'PlatformIncident',
      incident.id,
      {
        incidentId: incident.id,
        incidentNumber: incident.incidentNumber,
        severity: incident.severity,
        title: incident.title,
      },
    );

    return incident;
  }

  async updateIncident(id: string, dto: UpdateIncidentDto, actorUserId?: string) {
    const existing = await this.getIncident(id);
    const timeline = Array.isArray(existing.timeline) ? [...(existing.timeline as any[])] : [];

    const newStatus = dto.status || existing.status;
    const newSeverity = dto.severity || existing.severity;

    if (dto.timelineMessage || (dto.status && dto.status !== existing.status)) {
      timeline.push({
        timestamp: new Date().toISOString(),
        message: dto.timelineMessage || `Incident status updated to ${newStatus}`,
        status: newStatus,
        author: actorUserId || 'operator',
      });
    }

    const resolvedAt = newStatus === IncidentStatus.RESOLVED && !existing.resolvedAt ? new Date() : existing.resolvedAt;

    const updated = await this.prisma.platformIncident.update({
      where: { id },
      data: {
        status: newStatus,
        severity: newSeverity,
        timeline,
        resolvedAt,
      },
    });

    await this.outbox.publish(
      'platform.incident.updated',
      'PlatformIncident',
      updated.id,
      {
        incidentId: updated.id,
        incidentNumber: updated.incidentNumber,
        status: updated.status,
        severity: updated.severity,
      },
    );

    return updated;
  }
}
