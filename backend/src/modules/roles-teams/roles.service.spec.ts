import { RolesService } from './roles.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RecordScope } from '@prisma/client';

describe('RolesService', () => {
  let service: RolesService;
  let mockPrisma: any;
  let mockOutbox: any;

  const mockOrgId = 'org-123';
  const mockRoleId = 'role-123';

  beforeEach(() => {
    mockPrisma = {
      orgRole: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      orgRolePermission: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      orgMemberRole: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
      },
      platformPermissionRegistry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      securityAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };

    service = new RolesService(mockPrisma, mockOutbox);
  });

  describe('createRole', () => {
    it('should create a custom role and publish outbox event', async () => {
      mockPrisma.orgRole.findUnique.mockResolvedValue(null);
      mockPrisma.orgRole.create.mockResolvedValue({
        id: mockRoleId,
        organizationId: mockOrgId,
        name: 'Billing Specialist',
        code: 'billing_specialist',
        isBuiltIn: false,
        permissions: [],
      });

      const role = await service.createRole(mockOrgId, {
        name: 'Billing Specialist',
        description: 'Handles customer invoice issues',
      });

      expect(role.id).toBe(mockRoleId);
      expect(mockPrisma.orgRole.create).toHaveBeenCalled();
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'security.role.created',
        'OrgRole',
        mockRoleId,
        expect.anything(),
      );
    });

    it('should throw ConflictException if role code already exists in organization', async () => {
      mockPrisma.orgRole.findUnique.mockResolvedValue({ id: 'existing-role' });

      await expect(
        service.createRole(mockOrgId, {
          name: 'Billing Specialist',
          code: 'billing_specialist',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteRole', () => {
    it('should prevent deletion of built-in system roles', async () => {
      mockPrisma.orgRole.findFirst.mockResolvedValue({
        id: mockRoleId,
        organizationId: mockOrgId,
        isBuiltIn: true,
      });

      await expect(service.deleteRole(mockOrgId, mockRoleId)).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion of custom roles and publish outbox event', async () => {
      mockPrisma.orgRole.findFirst.mockResolvedValue({
        id: mockRoleId,
        organizationId: mockOrgId,
        isBuiltIn: false,
        name: 'Custom Reviewer',
      });
      mockPrisma.orgRole.delete.mockResolvedValue({ id: mockRoleId });

      const res = await service.deleteRole(mockOrgId, mockRoleId);
      expect(res.success).toBe(true);
      expect(mockPrisma.orgRole.delete).toHaveBeenCalledWith({ where: { id: mockRoleId } });
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'security.role.deleted',
        'OrgRole',
        mockRoleId,
        expect.anything(),
      );
    });
  });

  describe('assignRoleToMember', () => {
    it('should assign a role to a member and record audit event', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'member-1' });
      mockPrisma.orgRole.findFirst.mockResolvedValue({ id: mockRoleId, name: 'Billing Specialist' });
      mockPrisma.orgMemberRole.upsert.mockResolvedValue({
        id: 'assignment-1',
        organizationId: mockOrgId,
        memberId: 'member-1',
        roleId: mockRoleId,
      });

      const assignment = await service.assignRoleToMember(mockOrgId, 'member-1', mockRoleId);
      expect(assignment.id).toBe('assignment-1');
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'security.member.role_assigned',
        'OrgMemberRole',
        'assignment-1',
        expect.anything(),
      );
    });
  });
});
