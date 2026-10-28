import { SuperAdminService } from './admin.service';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue([]) },
      identityUser: { count: jest.fn().mockResolvedValue(42) },
      marketingEnquiry: { count: jest.fn().mockResolvedValue(18) },
      platformEventOutbox: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { count: jest.fn().mockResolvedValue(150), findMany: jest.fn().mockResolvedValue([]) },
      productCatalogPlaceholder: { count: jest.fn().mockResolvedValue(3) },
      saaSPlan: { count: jest.fn().mockResolvedValue(3) },
      platformIncident: { count: jest.fn().mockResolvedValue(0) },
      featureRollout: { count: jest.fn().mockResolvedValue(4) },
      connectorProvider: { count: jest.fn().mockResolvedValue(5) },
      orgRole: { count: jest.fn().mockResolvedValue(4) },
      orgTeam: { count: jest.fn().mockResolvedValue(2) },
      recordAccessGrant: { count: jest.fn().mockResolvedValue(6) },
      orgFieldPolicy: { count: jest.fn().mockResolvedValue(3) },
      securityAuditEvent: { count: jest.fn().mockResolvedValue(24), findMany: jest.fn().mockResolvedValue([]) },
    };

    service = new SuperAdminService(mockPrisma);
  });

  it('should return aggregate metrics without exposing raw sensitive tenant data', async () => {
    const metrics = await service.getOperationalMetrics();

    expect(metrics.overview.totalOrganizations).toBe(5);
    expect(metrics.overview.activeUsers).toBe(42);
    expect(metrics.overview.totalEnquiries).toBe(18);
    expect(metrics.overview.activePublishedPlans).toBe(3);
    expect(metrics.systemHealth).toBe('OPERATIONAL');
  });

  it('should return privacy-safe aggregate security telemetry', async () => {
    const telemetry = await service.getSecurityTelemetry();

    expect(telemetry.aggregate.totalConfiguredRoles).toBe(8);
    expect(telemetry.aggregate.teamsCount).toBe(2);
    expect(telemetry.aggregate.activeFieldPoliciesCount).toBe(3);
    expect(telemetry.aggregate.directRecordGrantsCount).toBe(6);
    expect(telemetry.status).toBe('HEALTHY');
  });
});
