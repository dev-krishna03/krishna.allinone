import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import * as crypto from 'crypto';
import { CreateDeveloperApiKeyDto } from './dto/developer.dto';

@Injectable()
export class DeveloperApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async listApiKeys(organizationId: string) {
    return this.prisma.developerApiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimitPerMin: true,
        monthlyQuota: true,
        usageCount: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdByUserId: true,
        createdAt: true,
      },
    });
  }

  async createApiKey(organizationId: string, dto: CreateDeveloperApiKeyDto, userId?: string) {
    // Generate secure API key with prefix
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `bos_live_${randomHex}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 3600 * 1000)
      : null;

    const record = await this.prisma.developerApiKey.create({
      data: {
        organizationId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes: dto.scopes && dto.scopes.length > 0 ? dto.scopes : ['read:all', 'write:core'],
        rateLimitPerMin: dto.rateLimitPerMin || 60,
        monthlyQuota: dto.monthlyQuota || 100000,
        expiresAt,
        createdByUserId: userId,
      },
    });

    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      rawKey, // Returned ONLY on initial creation
      scopes: record.scopes,
      rateLimitPerMin: record.rateLimitPerMin,
      monthlyQuota: record.monthlyQuota,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  async revokeApiKey(organizationId: string, keyId: string) {
    const key = await this.prisma.developerApiKey.findFirst({
      where: { id: keyId, organizationId },
    });

    if (!key) {
      throw new NotFoundException(`API key ${keyId} not found`);
    }

    await this.prisma.developerApiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async verifyApiKey(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = await this.prisma.developerApiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    });

    if (!key || key.revokedAt) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    // Increment usage
    await this.prisma.developerApiKey.update({
      where: { id: key.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return key;
  }
}
