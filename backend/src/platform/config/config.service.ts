import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformConfigService {
  readonly port: number = parseInt(process.env.PORT || '3001', 10);
  readonly nodeEnv: string = process.env.NODE_ENV || 'development';
  readonly databaseUrl: string = process.env.DATABASE_URL || 'postgresql://localhost:5432/business_os';
  readonly redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379';
  readonly corsOrigins: string[] = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
  readonly apiPrefix: string = process.env.API_PREFIX || 'api/v1';

  getConfigSummary() {
    return {
      environment: this.nodeEnv,
      authMode: 'ORGANIZATION_SCOPED',
      features: {
        multiTenant: true,
        auditLog: true,
        rateLimiting: true,
        outboxRelay: true,
      },
      defaultCurrency: 'USD',
      maintenanceMode: false,
    };
  }
}
