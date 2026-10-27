import {
  HealthCheckResponse,
  ProductCatalogItem,
  CreateEnquiryDto,
  MarketingEnquiry,
  PlatformConfig,
  User,
  Organization,
} from '@business-os/types';

export interface ApiClientConfig {
  baseUrl?: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  organizationId?: string;
}

export class BusinessOSApiClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null | Promise<string | null>;
  private organizationId?: string;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    this.getAuthToken = config.getAuthToken;
    this.organizationId = config.organizationId;
  }

  setOrganizationId(orgId: string) {
    this.organizationId = orgId;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.organizationId) {
      headers['x-organization-id'] = this.organizationId;
    }

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Health
  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }

  // Public Catalog & Pricing
  async getProducts(): Promise<ProductCatalogItem[]> {
    return this.request<ProductCatalogItem[]>('/api/v1/public/products');
  }

  async getPricing(): Promise<ProductCatalogItem[]> {
    return this.request<ProductCatalogItem[]>('/api/v1/public/pricing');
  }

  // Public Demo Requests / Enquiries
  async submitDemoRequest(dto: CreateEnquiryDto): Promise<MarketingEnquiry> {
    return this.request<MarketingEnquiry>('/api/v1/public/demo-requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // Platform Config
  async getPlatformConfig(): Promise<PlatformConfig> {
    return this.request<PlatformConfig>('/api/v1/platform/config');
  }

  // User & Organization identity
  async getMe(): Promise<{ user: User; organization: Organization; permissions: string[] }> {
    return this.request<{ user: User; organization: Organization; permissions: string[] }>('/api/v1/me');
  }
}

export const createApiClient = (config?: ApiClientConfig) => new BusinessOSApiClient(config);
