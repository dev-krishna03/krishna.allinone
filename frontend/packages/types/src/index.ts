export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'READ_ONLY';

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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  planTier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  createdAt: string;
  updatedAt: string;
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
