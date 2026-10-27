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
