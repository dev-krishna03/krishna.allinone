import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PermissionSensitivity } from '@prisma/client';

export interface DefaultPermissionDef {
  module: string;
  resource: string;
  action: string;
  sensitivity: PermissionSensitivity;
  label: string;
  description: string;
}

export const CANONICAL_PERMISSIONS: DefaultPermissionDef[] = [
  // Catalog
  {
    module: 'catalog',
    resource: 'items',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Catalog Items',
    description: 'Allows reading published products and pricing plans in the catalog',
  },
  {
    module: 'catalog',
    resource: 'items',
    action: 'create',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Create Catalog Items',
    description: 'Allows adding new products to the catalog',
  },
  {
    module: 'catalog',
    resource: 'items',
    action: 'update',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Update Catalog Items',
    description: 'Allows editing catalog products, descriptions and pricing',
  },
  {
    module: 'catalog',
    resource: 'items',
    action: 'delete',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Delete Catalog Items',
    description: 'Allows deleting or deprecating catalog items',
  },

  // Invoices & Billing
  {
    module: 'billing',
    resource: 'invoices',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Invoices',
    description: 'Allows viewing customer and vendor billing invoices',
  },
  {
    module: 'billing',
    resource: 'invoices',
    action: 'create',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Create Invoices',
    description: 'Allows drafting and generating invoices',
  },
  {
    module: 'billing',
    resource: 'invoices',
    action: 'update',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Update Invoices',
    description: 'Allows modifying invoice line items and terms',
  },
  {
    module: 'billing',
    resource: 'invoices',
    action: 'delete',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Delete Invoices',
    description: 'Allows cancelling or voiding invoices',
  },
  {
    module: 'billing',
    resource: 'invoices',
    action: 'approve',
    sensitivity: PermissionSensitivity.CRITICAL,
    label: 'Approve High-Value Invoices',
    description: 'Authorizes high-value disbursements and payouts',
  },

  // Financials
  {
    module: 'financials',
    resource: 'reports',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Financial Reports',
    description: 'Allows reading general ledger and profit/loss reports',
  },
  {
    module: 'financials',
    resource: 'sensitive_data',
    action: 'read',
    sensitivity: PermissionSensitivity.CRITICAL,
    label: 'View Sensitive Banking & Tax Data',
    description: 'Access to unmasked tax numbers, bank account numbers, and salaries',
  },
  {
    module: 'financials',
    resource: 'export',
    action: 'execute',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Export Financial Records',
    description: 'Allows bulk export of financial spreadsheets and statements',
  },

  // Deals / CRM
  {
    module: 'crm',
    resource: 'deals',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Deals',
    description: 'Allows viewing sales deals and opportunities',
  },
  {
    module: 'crm',
    resource: 'deals',
    action: 'create',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Create Deals',
    description: 'Allows adding new CRM deals',
  },
  {
    module: 'crm',
    resource: 'deals',
    action: 'update',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Update Deals',
    description: 'Allows advancing stages and editing deal amounts',
  },
  {
    module: 'crm',
    resource: 'deals',
    action: 'delete',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Delete Deals',
    description: 'Allows removing sales deals',
  },

  // Organization Members
  {
    module: 'members',
    resource: 'members',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Team Members',
    description: 'Allows browsing organization member directory',
  },
  {
    module: 'members',
    resource: 'members',
    action: 'invite',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Invite Members',
    description: 'Allows sending email invitations to join the workspace',
  },
  {
    module: 'members',
    resource: 'members',
    action: 'update',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Update Members',
    description: 'Allows editing member details, titles and profiles',
  },
  {
    module: 'members',
    resource: 'members',
    action: 'remove',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Remove Members',
    description: 'Allows revoking membership and removing users from organization',
  },

  // Roles & Security Policies
  {
    module: 'security',
    resource: 'roles',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Roles & Scopes',
    description: 'Allows viewing security roles and assigned permissions',
  },
  {
    module: 'security',
    resource: 'roles',
    action: 'manage',
    sensitivity: PermissionSensitivity.CRITICAL,
    label: 'Manage Security Roles',
    description: 'Allows creating, modifying and assigning custom RBAC roles',
  },
  {
    module: 'security',
    resource: 'teams',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Teams & Hierarchy',
    description: 'Allows viewing departmental trees and team compositions',
  },
  {
    module: 'security',
    resource: 'teams',
    action: 'manage',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Manage Teams & Departments',
    description: 'Allows creating teams, setting leads and assigning members',
  },
  {
    module: 'security',
    resource: 'policies',
    action: 'manage',
    sensitivity: PermissionSensitivity.CRITICAL,
    label: 'Manage ABAC & Field Policies',
    description: 'Allows configuring record sharing and field masking rules',
  },
  {
    module: 'security',
    resource: 'policies',
    action: 'simulate',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'Simulate Access Policies',
    description: 'Allows dry-run testing authorization scenarios against real policies',
  },

  // Audit Logs
  {
    module: 'audit',
    resource: 'logs',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Audit Trail',
    description: 'Allows inspecting chronological security and operational logs',
  },
  {
    module: 'audit',
    resource: 'logs',
    action: 'export',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Export Audit Logs',
    description: 'Allows generating compliance export bundles of audit records',
  },

  // Organization Settings
  {
    module: 'organization',
    resource: 'settings',
    action: 'read',
    sensitivity: PermissionSensitivity.NORMAL,
    label: 'View Organization Profile',
    description: 'Allows viewing workspace metadata, currency and timezone',
  },
  {
    module: 'organization',
    resource: 'settings',
    action: 'update',
    sensitivity: PermissionSensitivity.SENSITIVE,
    label: 'Update Organization Settings',
    description: 'Allows updating workspace settings, branding and domains',
  },
];

@Injectable()
export class PermissionRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PermissionRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedCanonicalPermissions();
  }

  async seedCanonicalPermissions() {
    for (const perm of CANONICAL_PERMISSIONS) {
      await this.prisma.platformPermissionRegistry.upsert({
        where: {
          module_resource_action: {
            module: perm.module,
            resource: perm.resource,
            action: perm.action,
          },
        },
        create: {
          module: perm.module,
          resource: perm.resource,
          action: perm.action,
          sensitivity: perm.sensitivity,
          label: perm.label,
          description: perm.description,
        },
        update: {
          sensitivity: perm.sensitivity,
          label: perm.label,
          description: perm.description,
        },
      });
    }
    this.logger.log(`Initialized ${CANONICAL_PERMISSIONS.length} canonical permissions in registry`);
  }

  async listPermissions() {
    return this.prisma.platformPermissionRegistry.findMany({
      orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });
  }

  async listPermissionsGrouped() {
    const list = await this.listPermissions();
    const grouped: Record<string, typeof list> = {};
    for (const perm of list) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }
    return grouped;
  }
}
