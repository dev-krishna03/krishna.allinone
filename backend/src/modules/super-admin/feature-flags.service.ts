import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { CreateFeatureRolloutDto, UpdateFeatureRolloutDto } from './dto/admin.dto';

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async listFlags() {
    return this.prisma.featureRollout.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlag(flagKey: string) {
    const flag = await this.prisma.featureRollout.findUnique({
      where: { flagKey },
    });
    if (!flag) {
      throw new NotFoundException(`Feature flag '${flagKey}' not found`);
    }
    return flag;
  }

  async createFlag(dto: CreateFeatureRolloutDto, actorId?: string) {
    const existing = await this.prisma.featureRollout.findUnique({
      where: { flagKey: dto.flagKey },
    });
    if (existing) {
      throw new ConflictException(`Feature flag with key '${dto.flagKey}' already exists`);
    }

    const flag = await this.prisma.featureRollout.create({
      data: {
        flagKey: dto.flagKey,
        name: dto.name,
        description: dto.description,
        isEnabled: dto.isEnabled ?? false,
        rolloutPercentage: dto.rolloutPercentage ?? 0,
        targetEditions: dto.targetEditions || [],
        targetOrganizationIds: dto.targetOrganizationIds || [],
        updatedBy: actorId,
      },
    });

    await this.outbox.publish(
      'platform.feature.flag_changed',
      'FeatureRollout',
      flag.id,
      {
        flagKey: flag.flagKey,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
      },
    );

    return flag;
  }

  async updateFlag(id: string, dto: UpdateFeatureRolloutDto, actorId?: string) {
    const flag = await this.prisma.featureRollout.findUnique({
      where: { id },
    });
    if (!flag) {
      throw new NotFoundException(`Feature flag with id ${id} not found`);
    }

    const updated = await this.prisma.featureRollout.update({
      where: { id },
      data: {
        name: dto.name ?? flag.name,
        description: dto.description ?? flag.description,
        isEnabled: dto.isEnabled ?? flag.isEnabled,
        rolloutPercentage: dto.rolloutPercentage ?? flag.rolloutPercentage,
        targetEditions: dto.targetEditions ?? flag.targetEditions,
        targetOrganizationIds: dto.targetOrganizationIds ?? flag.targetOrganizationIds,
        updatedBy: actorId,
      },
    });

    await this.outbox.publish(
      'platform.feature.flag_changed',
      'FeatureRollout',
      updated.id,
      {
        flagKey: updated.flagKey,
        isEnabled: updated.isEnabled,
        rolloutPercentage: updated.rolloutPercentage,
      },
    );

    return updated;
  }

  /**
   * Deterministic evaluation of whether a feature flag applies to a given context
   */
  async evaluateFlag(
    flagKey: string,
    context: { organizationId?: string; edition?: string; userId?: string } = {},
  ): Promise<{ flagKey: string; isEnabled: boolean; reason: string }> {
    const flag = await this.prisma.featureRollout.findUnique({
      where: { flagKey },
    });

    if (!flag) {
      return { flagKey, isEnabled: false, reason: 'FLAG_NOT_FOUND' };
    }

    if (!flag.isEnabled) {
      return { flagKey, isEnabled: false, reason: 'DISABLED' };
    }

    // 1. Direct Organization Whitelist
    if (context.organizationId && flag.targetOrganizationIds.includes(context.organizationId)) {
      return { flagKey, isEnabled: true, reason: 'TARGET_ORGANIZATION' };
    }

    // 2. Edition Whitelist
    if (context.edition && flag.targetEditions.includes(context.edition as any)) {
      return { flagKey, isEnabled: true, reason: 'TARGET_EDITION' };
    }

    // 3. User Whitelist
    if (context.userId && flag.targetUserIds.includes(context.userId)) {
      return { flagKey, isEnabled: true, reason: 'TARGET_USER' };
    }

    // 4. Percentage Rollout (Deterministic hashing based on organizationId or userId)
    if (flag.rolloutPercentage > 0) {
      const hashKey = context.organizationId || context.userId || 'anonymous';
      let hash = 0;
      for (let i = 0; i < hashKey.length; i++) {
        hash = (hash << 5) - hash + hashKey.charCodeAt(i);
        hash |= 0;
      }
      const score = Math.abs(hash) % 100;
      const isIncluded = score < flag.rolloutPercentage;
      return {
        flagKey,
        isEnabled: isIncluded,
        reason: isIncluded ? 'PERCENTAGE_INCLUDED' : 'PERCENTAGE_EXCLUDED',
      };
    }

    return { flagKey, isEnabled: false, reason: 'DEFAULT_OFF' };
  }
}
