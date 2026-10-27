import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import Redis from 'ioredis';
import { PlatformConfigService } from '../config/config.service';

@Injectable()
export class HealthService {
  private redisClient: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PlatformConfigService
  ) {
    try {
      this.redisClient = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
    } catch {
      this.redisClient = null;
    }
  }

  async checkHealth() {
    let dbStatus = false;
    let redisStatus = false;
    let outboxStatus = false;

    // Check Postgres
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = true;
    } catch {
      dbStatus = false;
    }

    // Check Redis
    if (this.redisClient) {
      try {
        if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connecting') {
          await this.redisClient.connect();
        }
        const pong = await this.redisClient.ping();
        redisStatus = pong === 'PONG';
      } catch {
        redisStatus = false;
      }
    }

    // Check Outbox
    try {
      await this.prisma.platformEventOutbox.count({
        where: { status: 'PENDING' },
      });
      outboxStatus = true;
    } catch {
      outboxStatus = false;
    }

    const isHealthy = dbStatus;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
        outbox: outboxStatus,
      },
      metrics: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}
