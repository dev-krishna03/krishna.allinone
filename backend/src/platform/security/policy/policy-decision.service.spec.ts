import { PolicyDecisionService } from './policy-decision.service';
import { RecordScope, GranteeType, AccessLevel, FieldPolicyType, PermissionSensitivity } from '@prisma/client';
import { applyFieldMasks } from './field-security.interceptor';

describe('PolicyDecisionService', () => {
  let service: PolicyDecisionService;
  let mockPrisma: any;
  let mockOutbox: any;

  const mockOrgId = 'org-123';
  const mockMemberId = 'member-456';

  beforeEach(() => {
    mockPrisma = {
      organizationMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      orgFieldPolicy: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      recordAccessGrant: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
      },
      accessPolicyVersion: {
        upsert: jest.fn(),
      },
      securityAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'sec-evt-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };

    service = new PolicyDecisionService(mockPrisma, mockOutbox);
  });

  describe('evaluateAccess - Deny by Default & Owner Bypass', () => {
    it('should deny by default when member has no matching permissions', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [],
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'invoices',
        action: 'approve',
      });

      expect(result.permit).toBe(false);
      expect(result.decision).toBe('DENY');
      expect(result.reason).toContain('Deny by default');
    });

    it('should allow immediately when member is organization OWNER', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'OWNER',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [],
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'invoices',
        action: 'approve',
      });

      expect(result.permit).toBe(true);
      expect(result.decision).toBe('ALLOW');
      expect(result.matchedRole).toBe('Owner');
    });

    it('should deny when member status is not ACTIVE', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'OWNER',
        status: 'SUSPENDED',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [],
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'invoices',
        action: 'read',
      });

      expect(result.permit).toBe(false);
      expect(result.decision).toBe('DENY');
    });
  });

  describe('evaluateAccess - RBAC & Record Scope Scenarios', () => {
    it('should allow access when role has permission with ALL scope', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [
          {
            role: {
              id: 'role-fin',
              name: 'Finance Manager',
              permissions: [
                {
                  recordScope: RecordScope.ALL,
                  permission: {
                    id: 'p1',
                    module: 'billing',
                    resource: 'invoices',
                    action: 'read',
                    sensitivity: PermissionSensitivity.NORMAL,
                  },
                },
              ],
            },
          },
        ],
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'invoices',
        action: 'read',
      });

      expect(result.permit).toBe(true);
      expect(result.decision).toBe('ALLOW');
      expect(result.grantedScope).toBe(RecordScope.ALL);
    });

    it('should enforce OWNER_ONLY scope: allow owner and deny non-owner', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [
          {
            role: {
              id: 'role-sales',
              name: 'Sales Rep',
              permissions: [
                {
                  recordScope: RecordScope.OWNER_ONLY,
                  permission: {
                    id: 'p2',
                    module: 'crm',
                    resource: 'deals',
                    action: 'update',
                    sensitivity: PermissionSensitivity.NORMAL,
                  },
                },
              ],
            },
          },
        ],
      });

      // Case 1: Member is record owner
      const ownResult = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'deals',
        action: 'update',
        recordOwnerId: mockMemberId,
      });
      expect(ownResult.permit).toBe(true);

      // Case 2: Another member owns the record (and no direct grant)
      mockPrisma.recordAccessGrant.findFirst.mockResolvedValue(null);
      const foreignResult = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'deals',
        action: 'update',
        recordId: 'deal-999',
        recordOwnerId: 'other-member',
      });
      expect(foreignResult.permit).toBe(false);
      expect(foreignResult.decision).toBe('DENY');
    });

    it('should permit access via direct RecordAccessGrant even when record scope would deny', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [],
      });

      // Direct grant awarded to user
      mockPrisma.recordAccessGrant.findFirst.mockResolvedValue({
        id: 'grant-1',
        organizationId: mockOrgId,
        resourceType: 'deals',
        recordId: 'deal-999',
        granteeType: GranteeType.USER,
        granteeId: mockMemberId,
        accessLevel: AccessLevel.READ,
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'deals',
        action: 'read',
        recordId: 'deal-999',
      });

      expect(result.permit).toBe(true);
      expect(result.decision).toBe('ALLOW');
      expect(result.effectiveAccessLevel).toBe('READ');
    });

    it('should inherit permissions from parent role in role hierarchy', async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: mockMemberId,
        organizationId: mockOrgId,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
        teamMemberships: [],
        roleAssignments: [
          {
            role: {
              id: 'role-junior-auditor',
              name: 'Junior Auditor',
              permissions: [],
              parentRole: {
                id: 'role-senior-auditor',
                name: 'Senior Auditor',
                permissions: [
                  {
                    recordScope: RecordScope.ALL,
                    permission: {
                      id: 'p-audit',
                      module: 'audit',
                      resource: 'logs',
                      action: 'read',
                      sensitivity: PermissionSensitivity.NORMAL,
                    },
                  },
                ],
              },
            },
          },
        ],
      });

      const result = await service.evaluateAccess({
        orgId: mockOrgId,
        memberId: mockMemberId,
        resource: 'logs',
        action: 'read',
      });

      expect(result.permit).toBe(true);
      expect(result.decision).toBe('ALLOW');
      expect(result.matchedRole).toContain('inherited from Senior Auditor');
    });
  });

  describe('Field Security Masking Utility', () => {
    it('should hide and mask restricted fields correctly', () => {
      const sampleRecord = {
        id: 'inv-123',
        customerName: 'Acme Corp',
        bankAccountNumber: '123456789012',
        internalMarginCost: 45000,
        socialSecurityNumber: '987-65-4321',
      };

      const rules = [
        { fieldName: 'internalMarginCost', policy: 'HIDE' as FieldPolicyType, maskPattern: null },
        { fieldName: 'bankAccountNumber', policy: 'MASK' as FieldPolicyType, maskPattern: '********####' },
        { fieldName: 'socialSecurityNumber', policy: 'MASK' as FieldPolicyType, maskPattern: '***-**-####' },
      ];

      const masked = applyFieldMasks(sampleRecord, rules);

      expect(masked.id).toBe('inv-123');
      expect(masked.customerName).toBe('Acme Corp');
      expect(masked.internalMarginCost).toBeUndefined();
      expect(masked.bankAccountNumber).toBe('********9012');
      expect(masked.socialSecurityNumber).toBe('***-**-4321');
    });
  });
});
