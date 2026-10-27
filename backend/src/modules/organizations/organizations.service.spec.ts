import { OrganizationsService } from './organizations.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole, MemberStatus, InviteStatus } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockPrisma: any;
  let mockOutbox: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
      },
      organizationInvitation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      identityUser: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockOutbox = {
      publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };
    mockAudit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new OrganizationsService(mockPrisma, mockOutbox, mockAudit);
  });

  describe('createOrganization', () => {
    it('should provision organization and assign creator as OWNER in transaction', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Nexus Corp',
        slug: 'nexus-corp',
        seatLimit: 25,
      });
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'usr-1',
        role: UserRole.OWNER,
      });

      const org = await service.createOrganization('usr-1', {
        name: 'Nexus Corp',
        slug: 'nexus-corp',
      });

      expect(org.id).toBe('org-1');
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'organization.created',
        'Organization',
        'org-1',
        expect.objectContaining({ slug: 'nexus-corp', ownerUserId: 'usr-1' })
      );
    });

    it('should reject organization creation when slug already exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'existing-org' });

      await expect(
        service.createOrganization('usr-1', { name: 'Acme', slug: 'acme' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('inviteMember', () => {
    it('should enforce organization seat capacity limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        seatLimit: 2,
        _count: { members: 2 }, // FULL CAPACITY
      });

      await expect(
        service.inviteMember('org-1', 'owner-usr', {
          email: 'newbie@acme.inc',
          role: UserRole.EMPLOYEE,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sole owner protection', () => {
    it('should prevent demoting or suspending the sole remaining owner', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        status: MemberStatus.ACTIVE,
      });
      mockPrisma.organizationMember.count.mockResolvedValue(1); // ONLY 1 OWNER

      await expect(
        service.updateMember('org-1', 'mem-1', 'owner-usr', {
          role: UserRole.EMPLOYEE,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent removing the sole remaining owner', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      });
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember('org-1', 'mem-1', 'owner-usr')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
