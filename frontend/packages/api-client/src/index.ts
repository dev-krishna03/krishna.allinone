import {
  HealthCheckResponse,
  ProductCatalogItem,
  CreateEnquiryDto,
  MarketingEnquiry,
  PlatformConfig,
  User,
  Organization,
  SignUpDto,
  LoginDto,
  AuthResponse,
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberDto,
  OrganizationMember,
  OrganizationInvitation,
  IdentitySession,
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

  // --- Platform & Health ---
  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }

  async getPlatformConfig(): Promise<PlatformConfig> {
    return this.request<PlatformConfig>('/api/v1/platform/config');
  }

  // --- Public Catalog & Pricing ---
  async getProducts(): Promise<ProductCatalogItem[]> {
    return this.request<ProductCatalogItem[]>('/api/v1/public/products');
  }

  async getPricing(): Promise<ProductCatalogItem[]> {
    return this.request<ProductCatalogItem[]>('/api/v1/public/pricing');
  }

  // --- Public Demo Requests ---
  async submitDemoRequest(dto: CreateEnquiryDto): Promise<MarketingEnquiry> {
    return this.request<MarketingEnquiry>('/api/v1/public/demo-requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- Authentication ---
  async signUp(dto: SignUpDto): Promise<{ message: string; user: any; verificationToken?: string }> {
    return this.request<{ message: string; user: any; verificationToken?: string }>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async refresh(refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string; expiresIn: number } }> {
    return this.request<{ tokens: { accessToken: string; refreshToken: string; expiresIn: number } }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
    return this.request<{ message: string; resetToken?: string }>('/api/v1/auth/password/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // --- Active Sessions ---
  async getSessions(): Promise<IdentitySession[]> {
    return this.request<IdentitySession[]>('/api/v1/me/sessions');
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/me/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async logoutAllSessions(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/v1/me/sessions', {
      method: 'DELETE',
    });
  }

  // --- Organizations & Tenancy ---
  async createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
    return this.request<Organization>('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getOrganizations(): Promise<{ organization: Organization; role: string; membersCount: number }[]> {
    return this.request<{ organization: Organization; role: string; membersCount: number }[]>('/api/v1/organizations');
  }

  async getOrganization(orgId: string): Promise<Organization & { membersCount: number; currentRole?: string }> {
    return this.request<Organization & { membersCount: number; currentRole?: string }>(`/api/v1/organizations/${orgId}`);
  }

  async inviteMember(orgId: string, dto: InviteMemberDto): Promise<OrganizationInvitation> {
    return this.request<OrganizationInvitation>(`/api/v1/organizations/${orgId}/invites`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getInvitations(orgId: string): Promise<OrganizationInvitation[]> {
    return this.request<OrganizationInvitation[]>(`/api/v1/organizations/${orgId}/invites`);
  }

  async acceptInvitation(orgId: string, token: string): Promise<{ message: string; organizationId: string; role: string }> {
    return this.request<{ message: string; organizationId: string; role: string }>(`/api/v1/organizations/${orgId}/invites/accept`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async revokeInvitation(orgId: string, inviteId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/invites/${inviteId}`, {
      method: 'DELETE',
    });
  }

  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    return this.request<OrganizationMember[]>(`/api/v1/organizations/${orgId}/members`);
  }

  async updateMember(orgId: string, memberId: string, dto: UpdateMemberDto): Promise<OrganizationMember> {
    return this.request<OrganizationMember>(`/api/v1/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async removeMember(orgId: string, memberId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async transferOwnership(orgId: string, newOwnerUserId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerUserId }),
    });
  }

  // --- Current Context ---
  async getMe(): Promise<{ user: User; organization: Organization; permissions: string[] }> {
    return this.request<{ user: User; organization: Organization; permissions: string[] }>('/api/v1/me');
  }
}

export const createApiClient = (config?: ApiClientConfig) => new BusinessOSApiClient(config);
