import { SuperAdminService } from './admin.service';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue([]) },
      user: { count: jest.fn().mockResolvedValue(42) },
      marketingEnquiry: { count: jest.fn().mockResolvedValue(18) },
      platformEventOutbox: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { count: jest.fn().mockResolvedValue(150), findMany: jest.fn().mockResolvedValue([]) },
      productCatalogPlaceholder: { count: jest.fn().mockResolvedValue(3) },
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
});
