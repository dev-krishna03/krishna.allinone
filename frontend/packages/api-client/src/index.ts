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
  PlatformPermission,
  OrgRole,
  OrgTeam,
  RecordAccessGrant,
  OrgFieldPolicy,
  CreateRoleDto,
  UpdateRoleDto,
  CreateTeamDto,
  UpdateTeamDto,
  CreateRecordGrantDto,
  UpsertFieldPolicyDto,
  PolicySimulationRequest,
  PolicySimulationResult,
  EffectiveAccessSummary,
  SecurityAuditEvent,
  SaaSProduct,
  SaaSProductFeature,
  SaaSPlan,
  SaaSPlanVersion,
  SaaSBundle,
  OrgEntitlement,
  OrgSeatAssignment,
  UsageMeter,
  CreateProductDto,
  UpdateProductDto,
  CreateFeatureDto,
  CreatePlanDto,
  CreateBundleDto,
  SubscribeEntitlementDto,
  AssignSeatDto,
  RecordUsageDto,
  EffectiveAppNavigation,
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

  // --- Permissions Catalog ---
  async getPermissionCatalog(): Promise<{ total: number; permissions: PlatformPermission[]; grouped: Record<string, PlatformPermission[]> }> {
    return this.request('/api/v1/permissions/catalog');
  }

  // --- Policy Engine & Simulator ---
  async getEffectiveAccess(orgId: string, memberId?: string): Promise<EffectiveAccessSummary> {
    const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
    return this.request<EffectiveAccessSummary>(`/api/v1/organizations/${orgId}/policy/effective-access${q}`);
  }

  async simulatePolicy(orgId: string, dto: PolicySimulationRequest): Promise<PolicySimulationResult> {
    return this.request<PolicySimulationResult>(`/api/v1/organizations/${orgId}/policy/simulate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getFieldPolicies(orgId: string, resourceType?: string): Promise<OrgFieldPolicy[]> {
    const q = resourceType ? `?resourceType=${encodeURIComponent(resourceType)}` : '';
    return this.request<OrgFieldPolicy[]>(`/api/v1/organizations/${orgId}/field-policies${q}`);
  }

  async upsertFieldPolicy(orgId: string, dto: UpsertFieldPolicyDto): Promise<OrgFieldPolicy> {
    return this.request<OrgFieldPolicy>(`/api/v1/organizations/${orgId}/field-policies`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async deleteFieldPolicy(orgId: string, policyId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/field-policies/${policyId}`, {
      method: 'DELETE',
    });
  }

  async getRecordShares(orgId: string, resourceType?: string, recordId?: string): Promise<RecordAccessGrant[]> {
    const params = new URLSearchParams();
    if (resourceType) params.set('resourceType', resourceType);
    if (recordId) params.set('recordId', recordId);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<RecordAccessGrant[]>(`/api/v1/organizations/${orgId}/shares${q}`);
  }

  async createRecordShare(orgId: string, dto: CreateRecordGrantDto): Promise<RecordAccessGrant> {
    return this.request<RecordAccessGrant>(`/api/v1/organizations/${orgId}/shares`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async deleteRecordShare(orgId: string, grantId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/shares/${grantId}`, {
      method: 'DELETE',
    });
  }

  async getSecurityAudit(orgId: string, limit = 50, offset = 0): Promise<{ events: SecurityAuditEvent[]; total: number; limit: number; offset: number }> {
    return this.request(`/api/v1/organizations/${orgId}/security-audit?limit=${limit}&offset=${offset}`);
  }

  // --- Roles Management ---
  async getRoles(orgId: string): Promise<OrgRole[]> {
    return this.request<OrgRole[]>(`/api/v1/organizations/${orgId}/roles`);
  }

  async getRole(orgId: string, roleId: string): Promise<OrgRole> {
    return this.request<OrgRole>(`/api/v1/organizations/${orgId}/roles/${roleId}`);
  }

  async createRole(orgId: string, dto: CreateRoleDto): Promise<OrgRole> {
    return this.request<OrgRole>(`/api/v1/organizations/${orgId}/roles`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateRole(orgId: string, roleId: string, dto: UpdateRoleDto): Promise<OrgRole> {
    return this.request<OrgRole>(`/api/v1/organizations/${orgId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async deleteRole(orgId: string, roleId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async seedDefaultRoles(orgId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/v1/organizations/${orgId}/roles/seed-defaults`, {
      method: 'POST',
    });
  }

  async assignMemberRole(orgId: string, memberId: string, roleId: string): Promise<any> {
    return this.request(`/api/v1/organizations/${orgId}/members/${memberId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
  }

  async removeMemberRole(orgId: string, memberId: string, roleId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/members/${memberId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // --- Teams & Department Hierarchy ---
  async getTeams(orgId: string): Promise<OrgTeam[]> {
    return this.request<OrgTeam[]>(`/api/v1/organizations/${orgId}/teams`);
  }

  async getTeam(orgId: string, teamId: string): Promise<OrgTeam> {
    return this.request<OrgTeam>(`/api/v1/organizations/${orgId}/teams/${teamId}`);
  }

  async createTeam(orgId: string, dto: CreateTeamDto): Promise<OrgTeam> {
    return this.request<OrgTeam>(`/api/v1/organizations/${orgId}/teams`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateTeam(orgId: string, teamId: string, dto: UpdateTeamDto): Promise<OrgTeam> {
    return this.request<OrgTeam>(`/api/v1/organizations/${orgId}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async deleteTeam(orgId: string, teamId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  async addTeamMember(orgId: string, teamId: string, memberId: string): Promise<any> {
    return this.request(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  }

  async removeTeamMember(orgId: string, teamId: string, memberId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 1.4: Catalog, Plans, Entitlements & Licensing ---
  async getPublicPricing(): Promise<any[]> {
    return this.request('/api/v1/public/pricing');
  }

  async getPlatformProducts(status?: string): Promise<SaaSProduct[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<SaaSProduct[]>(`/api/v1/platform/products${q}`);
  }

  async getPlatformProduct(idOrSlug: string): Promise<SaaSProduct> {
    return this.request<SaaSProduct>(`/api/v1/platform/products/${idOrSlug}`);
  }

  async createPlatformProduct(dto: CreateProductDto): Promise<SaaSProduct> {
    return this.request<SaaSProduct>('/api/v1/platform/products', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updatePlatformProduct(id: string, dto: UpdateProductDto): Promise<SaaSProduct> {
    return this.request<SaaSProduct>(`/api/v1/platform/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async addProductFeature(productId: string, dto: CreateFeatureDto): Promise<SaaSProductFeature> {
    return this.request<SaaSProductFeature>(`/api/v1/platform/products/${productId}/features`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getPlatformPlans(productId?: string, edition?: string): Promise<SaaSPlan[]> {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (edition) params.set('edition', edition);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<SaaSPlan[]>(`/api/v1/platform/plans${q}`);
  }

  async createPlatformPlan(dto: CreatePlanDto): Promise<SaaSPlan> {
    return this.request<SaaSPlan>('/api/v1/platform/plans', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async publishPlatformPlan(id: string): Promise<SaaSPlan> {
    return this.request<SaaSPlan>(`/api/v1/platform/plans/${id}/publish`, {
      method: 'POST',
    });
  }

  async getPlatformBundles(): Promise<SaaSBundle[]> {
    return this.request<SaaSBundle[]>('/api/v1/platform/bundles');
  }

  async createPlatformBundle(dto: CreateBundleDto): Promise<SaaSBundle> {
    return this.request<SaaSBundle>('/api/v1/platform/bundles', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getTenantEntitlements(orgId: string): Promise<OrgEntitlement[]> {
    return this.request<OrgEntitlement[]>(`/api/v1/organizations/${orgId}/entitlements`);
  }

  async subscribeTenant(orgId: string, dto: SubscribeEntitlementDto): Promise<OrgEntitlement> {
    return this.request<OrgEntitlement>(`/api/v1/organizations/${orgId}/entitlements/subscribe`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getEffectiveAppNavigation(orgId: string): Promise<EffectiveAppNavigation> {
    return this.request<EffectiveAppNavigation>(`/api/v1/organizations/${orgId}/entitlements/effective-nav`);
  }

  async getSeatAssignments(orgId: string, entitlementId?: string): Promise<OrgSeatAssignment[]> {
    const q = entitlementId ? `?entitlementId=${encodeURIComponent(entitlementId)}` : '';
    return this.request<OrgSeatAssignment[]>(`/api/v1/organizations/${orgId}/seats${q}`);
  }

  async assignSeat(orgId: string, dto: AssignSeatDto): Promise<OrgSeatAssignment> {
    return this.request<OrgSeatAssignment>(`/api/v1/organizations/${orgId}/seats/assign`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async revokeSeat(orgId: string, assignmentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/seats/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  async getTenantUsage(orgId: string): Promise<UsageMeter[]> {
    return this.request<UsageMeter[]>(`/api/v1/organizations/${orgId}/usage`);
  }

  async recordTenantUsage(orgId: string, dto: RecordUsageDto): Promise<any> {
    return this.request(`/api/v1/organizations/${orgId}/usage/record`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}

export const createApiClient = (config?: ApiClientConfig) => new BusinessOSApiClient(config);
