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

// ==========================================
// PHASE 1.5: SAAS BILLING, SUBSCRIPTIONS & INVOICES
// ==========================================

export enum SaaSSubscriptionStatus {
  TRIALING = 'TRIALING',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  PAUSED = 'PAUSED',
  CANCELLING = 'CANCELLING',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum CheckoutSessionStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum ProviderEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

export enum SaaSInvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export enum SaaSPaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum SaaSRefundStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum DunningStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERED = 'RECOVERED',
  FAILED = 'FAILED',
}

export interface SaaSCustomer {
  id: string;
  organizationId: string;
  providerCustomerId?: string | null;
  provider: string;
  billingEmail: string;
  billingName?: string | null;
  taxId?: string | null;
  address?: Record<string, any> | null;
  paymentMethodLast4?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodExpiry?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaaSSubscription {
  id: string;
  organizationId: string;
  customerId: string;
  planId: string;
  planVersionId: string;
  providerSubscriptionId?: string | null;
  status: SaaSSubscriptionStatus;
  seatQuantity: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  customer?: SaaSCustomer;
  plan?: SaaSPlan;
  planVersion?: SaaSPlanVersion;
  terms?: SaaSSubscriptionTerm[];
}

export interface SaaSSubscriptionTerm {
  id: string;
  subscriptionId: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  seatQuantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  quoteSnapshot: Record<string, any>;
  createdAt: string;
}

export interface SaaSSubscriptionEvent {
  id: string;
  subscriptionId: string;
  previousStatus?: SaaSSubscriptionStatus | null;
  newStatus: SaaSSubscriptionStatus;
  reason: string;
  actorId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface SaaSCheckoutSession {
  id: string;
  organizationId: string;
  customerId?: string | null;
  planId: string;
  planVersionId: string;
  idempotencyKey: string;
  sessionToken: string;
  providerSessionId?: string | null;
  amountTotal: number;
  currency: string;
  seatQuantity: number;
  status: CheckoutSessionStatus;
  successUrl: string;
  cancelUrl: string;
  quoteSnapshot: Record<string, any>;
  expiresAt: string;
  createdAt: string;
}

export interface SaaSProviderEvent {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  signatureVerified: boolean;
  status: ProviderEventStatus;
  payload: Record<string, any>;
  errorMessage?: string | null;
  processedAt?: string | null;
  receivedAt: string;
}

export interface SaaSInvoice {
  id: string;
  organizationId: string;
  subscriptionId?: string | null;
  customerId: string;
  invoiceNumber: string;
  providerInvoiceId?: string | null;
  status: SaaSInvoiceStatus;
  billingReason: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string | null;
  pdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  lineItems: any[];
  createdAt: string;
  updatedAt: string;
  payments?: SaaSPayment[];
}

export interface SaaSPayment {
  id: string;
  organizationId: string;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: SaaSPaymentStatus;
  paymentMethodType: string;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  refunds?: SaaSRefund[];
}

export interface SaaSRefund {
  id: string;
  paymentId: string;
  providerRefundId?: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: SaaSRefundStatus;
  createdAt: string;
}

export interface SaaSCreditAdjustment {
  id: string;
  organizationId: string;
  subscriptionId?: string | null;
  amount: number;
  currency: string;
  reason: string;
  appliedInvoiceId?: string | null;
  createdAt: string;
}

export interface SaaSDunningRun {
  id: string;
  subscriptionId: string;
  invoiceId: string;
  attemptCount: number;
  maxAttempts: number;
  status: DunningStatus;
  lastAttemptAt: string;
  nextAttemptAt?: string | null;
  gracePeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface ComputeQuoteDto {
  planId: string;
  planVersionId?: string;
  seatQuantity?: number;
  currency?: string;
}

export interface QuoteResponse {
  planId: string;
  planVersionId: string;
  planName: string;
  edition: string;
  interval: string;
  seatQuantity: number;
  unitPrice: number;
  subtotal: number;
  estimatedTax: number;
  totalAmount: number;
  currency: string;
  proration?: {
    isProrated: boolean;
    creditAmount: number;
    netPayable: number;
    daysRemaining: number;
  };
  signature: string;
  expiresAt: string;
}

export interface CreateCheckoutSessionDto {
  planId: string;
  planVersionId?: string;
  seatQuantity?: number;
  idempotencyKey?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface ChangeSubscriptionDto {
  targetPlanId?: string;
  targetPlanVersionId?: string;
  seatQuantity?: number;
  cancelAtPeriodEnd?: boolean;
  pause?: boolean;
}

export interface UpdatePaymentMethodDto {
  paymentMethodToken: string;
  brand?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

// ==========================================
// PHASE 1.6 — PLATFORM GOVERNANCE & MARKETPLACE
// ==========================================

export type PlatformAdminRoleType = 'PLATFORM_ADMIN' | 'OPERATOR' | 'SUPPORT_TIER_2' | 'SECURITY_OFFICER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type ConnectorAuthType = 'OAUTH2' | 'API_KEY' | 'WEBHOOK' | 'CUSTOM';
export type ConnectorInstallationStatus = 'PENDING' | 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'FAILED';
export type WebhookSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'FAILING';
export type WebhookDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
export type MarketplaceReviewStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
export type MarketplacePricingType = 'FREE' | 'INCLUDED' | 'PAID_ADDON';

export interface PlatformAdminRole {
  id: string;
  userId: string;
  role: PlatformAdminRoleType;
  permissions: string[];
  assignedAt: string;
  assignedBy?: string | null;
}

export interface PlatformIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices: string[];
  impactedOrganizationsCount: number;
  declaredByUserId?: string | null;
  resolvedAt?: string | null;
  timeline: Array<{
    timestamp: string;
    message: string;
    status: IncidentStatus;
    author?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorProvider {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  iconUrl?: string | null;
  authType: ConnectorAuthType;
  clientId?: string | null;
  authUrl?: string | null;
  tokenUrl?: string | null;
  scopesSupported: string[];
  isEnabled: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorInstallation {
  id: string;
  organizationId: string;
  providerId: string;
  status: ConnectorInstallationStatus;
  installedByUserId?: string | null;
  scopesGranted: string[];
  settings: Record<string, any>;
  externalAccountId?: string | null;
  externalAccountEmail?: string | null;
  lastSyncAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: ConnectorProvider;
}

export interface DeveloperApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  monthlyQuota: number;
  usageCount: number;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  rawKey?: string; // Only returned on generation
}

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  targetUrl: string;
  secretKey: string;
  subscribedEvents: string[];
  status: WebhookSubscriptionStatus;
  failureCount: number;
  failureThreshold: number;
  lastDeliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  responseStatusCode?: number | null;
  responseBody?: string | null;
  executionDurationMs?: number | null;
  attemptNumber: number;
  status: WebhookDeliveryStatus;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  longDescription?: string | null;
  iconUrl?: string | null;
  developerName: string;
  version: string;
  pricingType: MarketplacePricingType;
  priceAmount: number;
  requiredScopes: string[];
  capabilities: string[];
  installCount: number;
  reviewStatus: MarketplaceReviewStatus;
  isFeatured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  isInstalled?: boolean;
}

export interface FeatureRollout {
  id: string;
  flagKey: string;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetEditions: string[];
  targetOrganizationIds: string[];
  targetUserIds: string[];
  metadata: Record<string, any>;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformEventOutbox {
  id: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  lastError?: string | null;
  scheduledAt: string;
  processedAt?: string | null;
  createdAt: string;
}

export interface QueueJobTelemetry {
  id: string;
  name: string;
  status: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed';
  data: any;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  attemptsMade: number;
}

export interface QueueTelemetry {
  name: string;
  isPaused: boolean;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  recentJobs: QueueJobTelemetry[];
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    database: { status: 'up' | 'down'; latencyMs: number };
    redis: { status: 'up' | 'down'; latencyMs: number };
    outbox: { pendingEvents: number; failedEvents: number };
  };
  metrics: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    cpuUserMs: number;
  };
}

// Phase 1.6 DTOs
export interface CreateIncidentDto {
  title: string;
  description: string;
  severity: IncidentSeverity;
  affectedServices: string[];
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  timelineMessage?: string;
}

export interface CreateFeatureRolloutDto {
  flagKey: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetEditions?: string[];
  targetOrganizationIds?: string[];
}

export interface UpdateFeatureRolloutDto {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetEditions?: string[];
  targetOrganizationIds?: string[];
}

export interface CreateDeveloperApiKeyDto {
  name: string;
  scopes?: string[];
  rateLimitPerMin?: number;
  monthlyQuota?: number;
  expiresInDays?: number;
}

export interface CreateWebhookSubscriptionDto {
  targetUrl: string;
  subscribedEvents: string[];
  secretKey?: string;
}

export interface UpdateWebhookSubscriptionDto {
  targetUrl?: string;
  subscribedEvents?: string[];
  status?: WebhookSubscriptionStatus;
}


