export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'READ_ONLY';
export type MemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface IdentityUser {
  id: string;
  email: string;
  fullName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  timezone: string;
  locale: string;
  country: string;
  currency: string;
  seatLimit: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  planTier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  status: MemberStatus;
  joinedAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    isEmailVerified: boolean;
  };
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  token?: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface IdentitySession {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

// Auth DTOs
export interface SignUpDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: IdentityUser;
  tokens: AuthTokens;
  activeOrganization?: Organization | null;
  memberships: {
    organization: Organization;
    role: UserRole;
  }[];
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  legalName?: string;
  timezone?: string;
  locale?: string;
  country?: string;
  currency?: string;
}

export interface InviteMemberDto {
  email: string;
  role: UserRole;
}

export interface UpdateMemberDto {
  role?: UserRole;
  status?: MemberStatus;
}

export interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';
  priceCents: number;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  status: 'ACTIVE' | 'BETA' | 'DEPRECATED';
  features: string[];
  createdAt: string;
}

export interface MarketingEnquiry {
  id: string;
  name: string;
  email: string;
  companyName: string;
  productInterest?: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'ARCHIVED';
  source?: string;
  createdAt: string;
}

export interface CreateEnquiryDto {
  name: string;
  email: string;
  companyName: string;
  productInterest?: string;
  message: string;
  source?: string;
}

export interface SupportRequest {
  id: string;
  organizationId: string;
  requesterEmail: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export interface ApiClient {
  id: string;
  organizationId: string;
  name: string;
  clientId: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  revokedAt?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  services: {
    database: boolean;
    redis: boolean;
    outbox: boolean;
  };
  metrics?: {
    uptimeSeconds: number;
    memoryUsageMB: number;
  };
}

export interface PlatformConfig {
  environment: string;
  authMode: string;
  features: {
    multiTenant: boolean;
    auditLog: boolean;
    rateLimiting: boolean;
    outboxRelay: boolean;
  };
  defaultCurrency: string;
  maintenanceMode: boolean;
}

export interface DomainEvent<T = any> {
  id: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: T;
  createdAt: string;
  version: number;
}

// ==========================================
// PHASE 1.3: RBAC, ABAC, Record & Field Security
// ==========================================

export type PermissionSensitivity = 'NORMAL' | 'SENSITIVE' | 'CRITICAL';
export type RecordScope = 'OWNER_ONLY' | 'TEAM' | 'DEPARTMENT' | 'ALL';
export type GranteeType = 'USER' | 'TEAM';
export type AccessLevel = 'READ' | 'WRITE' | 'ADMIN';
export type FieldPolicyType = 'READ_WRITE' | 'READ_ONLY' | 'HIDE' | 'MASK';

export interface PlatformPermission {
  id: string;
  module: string;
  resource: string;
  action: string;
  sensitivity: PermissionSensitivity;
  label: string;
  description?: string | null;
  createdAt?: string;
}

export interface OrgRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  recordScope: RecordScope;
  createdAt?: string;
  permission?: PlatformPermission;
}

export interface OrgRole {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isBuiltIn: boolean;
  parentRoleId?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: OrgRolePermission[];
  memberCount?: number;
  parentRole?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface OrgMemberRole {
  id: string;
  organizationId: string;
  memberId: string;
  roleId: string;
  assignedAt: string;
  role?: OrgRole;
}

export interface OrgTeamMember {
  id: string;
  teamId: string;
  memberId: string;
  createdAt: string;
  member?: OrganizationMember;
}

export interface OrgTeam {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  parentTeamId?: string | null;
  leadMemberId?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: OrgTeamMember[];
  parentTeam?: OrgTeam | null;
  childTeams?: OrgTeam[];
  leadMember?: OrganizationMember | null;
  memberCount?: number;
}

export interface RecordAccessGrant {
  id: string;
  organizationId: string;
  resourceType: string;
  recordId: string;
  granteeType: GranteeType;
  granteeId: string;
  accessLevel: AccessLevel;
  createdAt: string;
}

export interface OrgFieldPolicy {
  id: string;
  organizationId: string;
  roleId?: string | null;
  resourceType: string;
  fieldName: string;
  policy: FieldPolicyType;
  maskPattern?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessPolicyVersion {
  id: string;
  organizationId: string;
  version: number;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface SecurityAuditEvent {
  id: string;
  organizationId: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface CreateRoleDto {
  name: string;
  code?: string;
  description?: string;
  parentRoleId?: string | null;
  permissions?: {
    permissionId: string;
    recordScope: RecordScope;
  }[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  parentRoleId?: string | null;
  permissions?: {
    permissionId: string;
    recordScope: RecordScope;
  }[];
}

export interface CreateTeamDto {
  name: string;
  code?: string;
  parentTeamId?: string | null;
  leadMemberId?: string | null;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  parentTeamId?: string | null;
  leadMemberId?: string | null;
  description?: string;
}

export interface CreateRecordGrantDto {
  resourceType: string;
  recordId: string;
  granteeType: GranteeType;
  granteeId: string;
  accessLevel: AccessLevel;
}

export interface UpsertFieldPolicyDto {
  roleId?: string | null;
  resourceType: string;
  fieldName: string;
  policy: FieldPolicyType;
  maskPattern?: string;
}

export interface PolicySimulationRequest {
  memberId: string;
  action: string;
  resource: string;
  module?: string;
  recordOwnerId?: string;
  recordTeamId?: string;
  recordDepartmentId?: string;
}

export interface PolicySimulationResult {
  permit: boolean;
  decision: 'ALLOW' | 'DENY';
  reason: string;
  matchedRole?: string;
  grantedScope?: RecordScope;
  effectiveAccessLevel?: AccessLevel;
  fieldPolicies?: {
    fieldName: string;
    policy: FieldPolicyType;
    maskPattern?: string | null;
  }[];
  evaluatedAt: string;
}

export interface EffectiveAccessSummary {
  memberId: string;
  roles: {
    id: string;
    name: string;
    code: string;
    permissions: {
      permissionId: string;
      module: string;
      resource: string;
      action: string;
      sensitivity: PermissionSensitivity;
      recordScope: RecordScope;
    }[];
  }[];
  teams: {
    id: string;
    name: string;
    code: string;
    isLead: boolean;
  }[];
  fieldPolicies: OrgFieldPolicy[];
}

// ==========================================
// PHASE 1.4: Dynamic Catalog, Plans, Entitlements & Licensing
// ==========================================

export type SaaSProductStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
export type FeatureType = 'BOOLEAN' | 'LIMIT' | 'METERED';
export type PlanEdition = 'COMMUNITY' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type PlanPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EntitlementStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
export type SeatStatus = 'ACTIVE' | 'REVOKED';

export interface SaaSProductFeature {
  id: string;
  productId: string;
  code: string;
  name: string;
  description?: string | null;
  type: FeatureType;
  defaultLimit?: number | null;
  createdAt?: string;
}

export interface SaaSPlanVersion {
  id: string;
  planId: string;
  version: number;
  priceAmount: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  featureLimits?: Record<string, any> | null;
  createdAt?: string;
}

export interface SaaSPlan {
  id: string;
  productId?: string | null;
  name: string;
  code: string;
  edition: PlanEdition;
  billingInterval: 'MONTHLY' | 'YEARLY';
  isBundle: boolean;
  status: PlanPublishStatus;
  trialDays: number;
  includedSeats: number;
  createdAt: string;
  updatedAt: string;
  versions?: SaaSPlanVersion[];
  currentVersion?: SaaSPlanVersion | null;
  product?: SaaSProduct | null;
}

export interface SaaSBundleItem {
  id: string;
  bundleId: string;
  productId: string;
  product?: SaaSProduct;
}

export interface SaaSBundle {
  id: string;
  code: string;
  name: string;
  description: string;
  status: SaaSProductStatus;
  createdAt: string;
  updatedAt: string;
  bundleItems?: SaaSBundleItem[];
}

export interface SaaSProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string | null;
  status: SaaSProductStatus;
  category: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  features?: SaaSProductFeature[];
  plans?: SaaSPlan[];
}

export interface OrgEntitlement {
  id: string;
  organizationId: string;
  productId?: string | null;
  bundleId?: string | null;
  planId: string;
  planVersionId: string;
  status: EntitlementStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  assignedSeatsLimit: number;
  featureOverrides?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  product?: SaaSProduct | null;
  bundle?: SaaSBundle | null;
  plan?: SaaSPlan | null;
  planVersion?: SaaSPlanVersion | null;
  assignedSeatsCount?: number;
}

export interface OrgSeatAssignment {
  id: string;
  organizationId: string;
  memberId: string;
  productId?: string | null;
  entitlementId: string;
  status: SeatStatus;
  assignedAt: string;
  member?: OrganizationMember;
  product?: SaaSProduct | null;
}

export interface UsageMeter {
  id: string;
  organizationId: string;
  featureCode: string;
  periodStart: string;
  periodEnd: string;
  currentUsage: number;
  softLimit?: number | null;
  hardLimit?: number | null;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  organizationId: string;
  operationId: string;
  featureCode: string;
  quantity: number;
  timestamp: string;
  metadata?: any;
}

export interface PriceBook {
  id: string;
  code: string;
  currency: string;
  region: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateProductDto {
  slug: string;
  name: string;
  description: string;
  icon?: string;
  category?: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';
  dependencies?: string[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  icon?: string;
  category?: 'CORE' | 'FINANCE' | 'OPERATIONS' | 'GROWTH';
  dependencies?: string[];
}

export interface CreateFeatureDto {
  code: string;
  name: string;
  description?: string;
  type: FeatureType;
  defaultLimit?: number;
}

export interface CreatePlanDto {
  productId?: string | null;
  name: string;
  code?: string;
  edition: PlanEdition;
  billingInterval: 'MONTHLY' | 'YEARLY';
  isBundle?: boolean;
  trialDays?: number;
  includedSeats?: number;
  priceAmount: number;
  currency?: string;
  featureLimits?: Record<string, any>;
}

export interface CreateBundleDto {
  code?: string;
  name: string;
  description: string;
  productIds: string[];
}

export interface SubscribeEntitlementDto {
  planId: string;
  planVersionId?: string;
  seats?: number;
  isTrial?: boolean;
}

export interface AssignSeatDto {
  memberId: string;
  entitlementId: string;
  productId?: string;
}

export interface RecordUsageDto {
  operationId: string;
  featureCode: string;
  quantity: number;
  metadata?: any;
}

export interface EffectiveAppNavigation {
  availableApps: {
    slug: string;
    name: string;
    icon?: string | null;
    category: string;
    edition: PlanEdition;
    isEntitled: boolean;
    hasSeat: boolean;
    requiresSeat: boolean;
    launchUrl: string;
  }[];
}
