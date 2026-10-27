import { EntitlementsService } from './entitlements.service';
import { EntitlementStatus, SeatStatus } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('EntitlementsService', () => {
  let service: EntitlementsService;
  let mockPrisma: any;
  let mockOutbox: any;

  const mockOrgId = 'org-123';
  const mockEntitlementId = 'ent-123';
  const mockMemberId = 'member-456';

  beforeEach(() => {
    mockPrisma = {
      saaSPlan: {
        findUnique: jest.fn(),
      },
      saaSBundle: {
        findFirst: jest.fn(),
      },
      saaSProduct: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      orgEntitlement: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      orgSeatAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      usageMeter: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      usageEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };

    service = new EntitlementsService(mockPrisma, mockOutbox);
  });

  describe('subscribeTenant', () => {
    it('should create an active entitlement and emit entitlement.changed event', async () => {
      mockPrisma.saaSPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        code: 'crm_starter',
        productId: 'prod-crm',
        trialDays: 14,
        includedSeats: 5,
        versions: [{ id: 'ver-1' }],
      });

      mockPrisma.orgEntitlement.create.mockResolvedValue({
        id: mockEntitlementId,
        organizationId: mockOrgId,
        planId: 'plan-1',
        status: EntitlementStatus.ACTIVE,
        assignedSeatsLimit: 5,
      });

      const entitlement = await service.subscribeTenant(mockOrgId, { planId: 'plan-1' });

      expect(entitlement.id).toBe(mockEntitlementId);
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'entitlement.changed',
        'OrgEntitlement',
        mockEntitlementId,
        expect.anything(),
      );
    });
  });

  describe('assignSeat - Concurrency & Quota Enforcement', () => {
    it('should assign a seat when quota is available', async () => {
      mockPrisma.orgEntitlement.findFirst.mockResolvedValue({
        id: mockEntitlementId,
        organizationId: mockOrgId,
        status: EntitlementStatus.ACTIVE,
        assignedSeatsLimit: 5,
        productId: 'prod-crm',
        _count: { seats: 2 },
      });

      mockPrisma.orgSeatAssignment.upsert.mockResolvedValue({
        id: 'seat-1',
        organizationId: mockOrgId,
        memberId: mockMemberId,
        entitlementId: mockEntitlementId,
        status: SeatStatus.ACTIVE,
      });

      const assignment = await service.assignSeat(mockOrgId, {
        memberId: mockMemberId,
        entitlementId: mockEntitlementId,
      });

      expect(assignment.id).toBe('seat-1');
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'seat.assigned',
        'OrgSeatAssignment',
        'seat-1',
        expect.anything(),
      );
    });

    it('should throw ConflictException when seat quota is exceeded', async () => {
      mockPrisma.orgEntitlement.findFirst.mockResolvedValue({
        id: mockEntitlementId,
        organizationId: mockOrgId,
        status: EntitlementStatus.ACTIVE,
        assignedSeatsLimit: 5,
        _count: { seats: 5 }, // All seats already taken
      });

      await expect(
        service.assignSeat(mockOrgId, {
          memberId: mockMemberId,
          entitlementId: mockEntitlementId,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordUsage - Metering & Thresholds', () => {
    it('should ignore duplicate usage event with identical operationId', async () => {
      mockPrisma.usageEvent.findUnique.mockResolvedValue({ id: 'evt-dup', operationId: 'op-999' });

      const res = await service.recordUsage(mockOrgId, {
        operationId: 'op-999',
        featureCode: 'api_calls',
        quantity: 10,
      });

      expect(res.status).toBe('DUPLICATE_IGNORED');
    });

    it('should emit usage.threshold.reached when soft limit is breached', async () => {
      mockPrisma.usageEvent.findUnique.mockResolvedValue(null);
      mockPrisma.usageEvent.create.mockResolvedValue({ operationId: 'op-new' });
      mockPrisma.usageMeter.upsert.mockResolvedValue({
        id: 'meter-1',
        currentUsage: 1050,
        softLimit: 1000,
        hardLimit: 2000,
      });

      const res = await service.recordUsage(mockOrgId, {
        operationId: 'op-new',
        featureCode: 'storage_mb',
        quantity: 1050,
      });

      expect(res.success).toBe(true);
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'usage.threshold.reached',
        'UsageMeter',
        'meter-1',
        expect.anything(),
      );
    });
  });
});
