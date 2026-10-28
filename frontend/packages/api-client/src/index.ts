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
  SaaSCustomer,
  SaaSSubscription,
  SaaSSubscriptionTerm,
  SaaSCheckoutSession,
  SaaSProviderEvent,
  SaaSInvoice,
  SaaSPayment,
  ComputeQuoteDto,
  QuoteResponse,
  CreateCheckoutSessionDto,
  ChangeSubscriptionDto,
  UpdatePaymentMethodDto,
  PlatformIncident,
  CreateIncidentDto,
  UpdateIncidentDto,
  FeatureRollout,
  CreateFeatureRolloutDto,
  UpdateFeatureRolloutDto,
  QueueTelemetry,
  PlatformEventOutbox,
  DeveloperApiKey,
  CreateDeveloperApiKeyDto,
  ConnectorProvider,
  ConnectorInstallation,
  MarketplaceListing,
  WebhookSubscription,
  CreateWebhookSubscriptionDto,
  WebhookDelivery,
  SystemHealthReport,
  WsWorkspace,
  WsPage,
  WsPageBlock,
  WsPageRevision,
  WsPagePermission,
  WsPageComment,
  WsPageCollabSnapshot,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreatePageDto,
  UpdatePageDto,
  MovePageDto,
  DuplicatePageDto,
  PublishPageDto,
  CreateBlockDto,
  UpdateBlockDto,
  ReorderBlocksDto,
  CreateRevisionDto,
  RevertRevisionDto,
  CreatePermissionDto,
  CreateCommentDto,
  CollabTokenResponse,
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

  // --- Phase 1.5: Billing, Subscriptions & Invoices ---
  async getBillingQuote(orgId: string, dto: ComputeQuoteDto): Promise<QuoteResponse> {
    return this.request<QuoteResponse>(`/api/v1/organizations/${orgId}/billing/quote`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async createCheckoutSession(orgId: string, dto: CreateCheckoutSessionDto): Promise<SaaSCheckoutSession> {
    return this.request<SaaSCheckoutSession>(`/api/v1/organizations/${orgId}/billing/checkout`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getSubscription(orgId: string): Promise<SaaSSubscription | null> {
    return this.request<SaaSSubscription | null>(`/api/v1/organizations/${orgId}/billing/subscription`);
  }

  async changeSubscription(orgId: string, dto: ChangeSubscriptionDto): Promise<SaaSSubscription> {
    return this.request<SaaSSubscription>(`/api/v1/organizations/${orgId}/billing/subscription/change`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async listInvoices(orgId: string): Promise<SaaSInvoice[]> {
    return this.request<SaaSInvoice[]>(`/api/v1/organizations/${orgId}/billing/invoices`);
  }

  async updatePaymentMethod(orgId: string, dto: UpdatePaymentMethodDto): Promise<SaaSCustomer> {
    return this.request<SaaSCustomer>(`/api/v1/organizations/${orgId}/billing/payment-method`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getSuperAdminBillingMetrics(): Promise<any> {
    return this.request('/api/v1/admin/billing/overview');
  }

  async listSuperAdminInvoices(): Promise<SaaSInvoice[]> {
    return this.request<SaaSInvoice[]>('/api/v1/admin/billing/invoices');
  }

  async listSuperAdminPayments(): Promise<SaaSPayment[]> {
    return this.request<SaaSPayment[]>('/api/v1/admin/billing/payments');
  }

  async listWebhookEvents(provider?: string): Promise<SaaSProviderEvent[]> {
    const q = provider ? `?provider=${encodeURIComponent(provider)}` : '';
    return this.request<SaaSProviderEvent[]>(`/api/v1/admin/billing/webhook-events${q}`);
  }

  async retryWebhookEvent(eventId: string): Promise<any> {
    return this.request(`/api/v1/admin/billing/webhook-events/${eventId}/retry`, {
      method: 'POST',
    });
  }

  // ==========================================
  // PHASE 1.6 — PLATFORM GOVERNANCE & INTEGRATIONS
  // ==========================================

  // --- System Health & Platform Incidents ---
  async getSystemHealth(): Promise<SystemHealthReport> {
    return this.request<SystemHealthReport>('/api/v1/platform/system-health');
  }

  async listIncidents(status?: string): Promise<PlatformIncident[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<PlatformIncident[]>(`/api/v1/platform/incidents${q}`);
  }

  async createIncident(dto: CreateIncidentDto): Promise<PlatformIncident> {
    return this.request<PlatformIncident>('/api/v1/platform/incidents', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateIncident(id: string, dto: UpdateIncidentDto): Promise<PlatformIncident> {
    return this.request<PlatformIncident>(`/api/v1/platform/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  // --- Feature Rollouts Governance ---
  async listFeatureFlags(): Promise<FeatureRollout[]> {
    return this.request<FeatureRollout[]>('/api/v1/platform/feature-flags');
  }

  async createFeatureFlag(dto: CreateFeatureRolloutDto): Promise<FeatureRollout> {
    return this.request<FeatureRollout>('/api/v1/platform/feature-flags', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateFeatureFlag(id: string, dto: UpdateFeatureRolloutDto): Promise<FeatureRollout> {
    return this.request<FeatureRollout>(`/api/v1/platform/feature-flags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  // --- Developer Queue & Durable Outbox Telemetry ---
  async getQueueTelemetry(): Promise<QueueTelemetry[]> {
    return this.request<QueueTelemetry[]>('/api/v1/developer/queues');
  }

  async listOutboxEvents(params?: { status?: string; limit?: number }): Promise<PlatformEventOutbox[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<PlatformEventOutbox[]>(`/api/v1/developer/events${query}`);
  }

  async replayOutboxEvent(id: string): Promise<any> {
    return this.request(`/api/v1/developer/events/${id}/replay`, {
      method: 'POST',
    });
  }

  // --- Developer API Keys ---
  async listDeveloperApiKeys(orgId: string): Promise<DeveloperApiKey[]> {
    return this.request<DeveloperApiKey[]>(`/api/v1/organizations/${orgId}/developer/api-keys`);
  }

  async createDeveloperApiKey(orgId: string, dto: CreateDeveloperApiKeyDto): Promise<DeveloperApiKey> {
    return this.request<DeveloperApiKey>(`/api/v1/organizations/${orgId}/developer/api-keys`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async revokeDeveloperApiKey(orgId: string, keyId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/developer/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  // --- Connectors & OAuth Integrations ---
  async listConnectorProviders(): Promise<ConnectorProvider[]> {
    return this.request<ConnectorProvider[]>('/api/v1/platform/connectors/providers');
  }

  async listOrgIntegrations(orgId: string): Promise<ConnectorInstallation[]> {
    return this.request<ConnectorInstallation[]>(`/api/v1/organizations/${orgId}/integrations`);
  }

  async initiateOAuthConnect(orgId: string, providerSlug: string, redirectUri?: string): Promise<{ authUrl: string; state: string }> {
    return this.request<{ authUrl: string; state: string }>(`/api/v1/integrations/${providerSlug}/connect`, {
      method: 'POST',
      body: JSON.stringify({ organizationId: orgId, redirectUri }),
    });
  }

  async disconnectIntegration(orgId: string, providerId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/integrations/${providerId}`, {
      method: 'DELETE',
    });
  }

  // --- Marketplace Listings ---
  async listMarketplaceApps(category?: string): Promise<MarketplaceListing[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<MarketplaceListing[]>(`/api/v1/marketplace/listings${q}`);
  }

  async getMarketplaceApp(slug: string): Promise<MarketplaceListing> {
    return this.request<MarketplaceListing>(`/api/v1/marketplace/listings/${slug}`);
  }

  async installMarketplaceApp(orgId: string, slug: string): Promise<{ success: boolean; installation?: ConnectorInstallation }> {
    return this.request<{ success: boolean; installation?: ConnectorInstallation }>(
      `/api/v1/organizations/${orgId}/marketplace/install/${slug}`,
      { method: 'POST' }
    );
  }

  // --- Webhooks Governance ---
  async listWebhookSubscriptions(orgId: string): Promise<WebhookSubscription[]> {
    return this.request<WebhookSubscription[]>(`/api/v1/organizations/${orgId}/webhooks`);
  }

  async createWebhookSubscription(orgId: string, dto: CreateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    return this.request<WebhookSubscription>(`/api/v1/organizations/${orgId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async deleteWebhookSubscription(orgId: string, id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  async testWebhookSubscription(orgId: string, id: string): Promise<{ success: boolean; statusCode?: number; durationMs?: number }> {
    return this.request<{ success: boolean; statusCode?: number; durationMs?: number }>(
      `/api/v1/organizations/${orgId}/webhooks/${id}/test`,
      { method: 'POST' }
    );
  }

  async listWebhookDeliveries(orgId: string, subscriptionId: string): Promise<WebhookDelivery[]> {
    return this.request<WebhookDelivery[]>(`/api/v1/organizations/${orgId}/webhooks/${subscriptionId}/deliveries`);
  }

  // ==========================================
  // WORKSPACE, DOCUMENTS & COLLAB API
  // ==========================================

  // --- Workspaces ---
  async listWorkspaces(orgId: string): Promise<WsWorkspace[]> {
    return this.request<WsWorkspace[]>(`/api/v1/organizations/${orgId}/workspace`);
  }

  async createWorkspace(orgId: string, dto: CreateWorkspaceDto): Promise<WsWorkspace> {
    return this.request<WsWorkspace>(`/api/v1/organizations/${orgId}/workspace`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getWorkspace(orgId: string, workspaceId: string): Promise<WsWorkspace> {
    return this.request<WsWorkspace>(`/api/v1/organizations/${orgId}/workspace/${workspaceId}`);
  }

  async updateWorkspace(orgId: string, workspaceId: string, dto: UpdateWorkspaceDto): Promise<WsWorkspace> {
    return this.request<WsWorkspace>(`/api/v1/organizations/${orgId}/workspace/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  // --- Pages ---
  async listPages(
    orgId: string,
    params?: {
      workspaceId?: string;
      isDeleted?: boolean;
      isTemplate?: boolean;
      templateCategory?: string;
      parentId?: string | null;
    },
  ): Promise<WsPage[]> {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set('workspaceId', params.workspaceId);
    if (params?.isDeleted !== undefined) query.set('isDeleted', String(params.isDeleted));
    if (params?.isTemplate !== undefined) query.set('isTemplate', String(params.isTemplate));
    if (params?.templateCategory) query.set('templateCategory', params.templateCategory);
    if (params?.parentId !== undefined) query.set('parentId', params.parentId === null ? 'null' : params.parentId);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.request<WsPage[]>(`/api/v1/organizations/${orgId}/workspace/pages${qs}`);
  }

  async createPage(orgId: string, dto: CreatePageDto): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getPage(orgId: string, pageId: string): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}`);
  }

  async updatePage(orgId: string, pageId: string, dto: UpdatePageDto): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deletePage(orgId: string, pageId: string): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}`, {
      method: 'DELETE',
    });
  }

  async permanentlyDeletePage(orgId: string, pageId: string): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/permanent`, {
      method: 'DELETE',
    });
  }

  async restorePage(orgId: string, pageId: string): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/restore`, {
      method: 'POST',
    });
  }

  async movePage(orgId: string, pageId: string, dto: MovePageDto): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/move`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async duplicatePage(orgId: string, pageId: string, dto: DuplicatePageDto): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async togglePageFavorite(orgId: string, pageId: string): Promise<{ isFavorite: boolean }> {
    return this.request<{ isFavorite: boolean }>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/favorite`, {
      method: 'POST',
    });
  }

  async publishPage(orgId: string, pageId: string, dto: PublishPageDto): Promise<WsPage> {
    return this.request<WsPage>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/publish`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getPublicPage(publishedSlug: string): Promise<any> {
    return this.request<any>(`/api/v1/public/pages/${publishedSlug}`);
  }

  // --- Blocks ---
  async listBlocks(orgId: string, pageId: string): Promise<WsPageBlock[]> {
    return this.request<WsPageBlock[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks`);
  }

  async createBlock(orgId: string, pageId: string, dto: CreateBlockDto): Promise<WsPageBlock> {
    return this.request<WsPageBlock>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateBlock(orgId: string, pageId: string, blockId: string, dto: UpdateBlockDto): Promise<WsPageBlock> {
    return this.request<WsPageBlock>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteBlock(orgId: string, pageId: string, blockId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  async reorderBlocks(orgId: string, pageId: string, dto: ReorderBlocksDto): Promise<WsPageBlock[]> {
    return this.request<WsPageBlock[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/blocks/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // --- Versions & Revisions ---
  async listPageRevisions(orgId: string, pageId: string): Promise<WsPageRevision[]> {
    return this.request<WsPageRevision[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions`);
  }

  async getPageRevision(orgId: string, pageId: string, version: number): Promise<WsPageRevision> {
    return this.request<WsPageRevision>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions/${version}`);
  }

  async createNamedRevision(orgId: string, pageId: string, dto: CreateRevisionDto): Promise<WsPageRevision> {
    return this.request<WsPageRevision>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async revertPageRevision(orgId: string, pageId: string, dto: RevertRevisionDto): Promise<{ success: boolean; page: WsPage; revision: WsPageRevision }> {
    return this.request<{ success: boolean; page: WsPage; revision: WsPageRevision }>(
      `/api/v1/organizations/${orgId}/workspace/pages/${pageId}/versions/revert`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  }

  // --- Permissions / Sharing ---
  async listPagePermissions(orgId: string, pageId: string): Promise<WsPagePermission[]> {
    return this.request<WsPagePermission[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/share`);
  }

  async grantPagePermission(orgId: string, pageId: string, dto: CreatePermissionDto): Promise<WsPagePermission> {
    return this.request<WsPagePermission>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/share`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async revokePagePermission(orgId: string, pageId: string, permissionId: string): Promise<WsPagePermission> {
    return this.request<WsPagePermission>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/share/${permissionId}`, {
      method: 'DELETE',
    });
  }

  // --- Comments ---
  async listPageComments(orgId: string, pageId: string): Promise<WsPageComment[]> {
    return this.request<WsPageComment[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments`);
  }

  async createPageComment(orgId: string, pageId: string, dto: CreateCommentDto): Promise<WsPageComment> {
    return this.request<WsPageComment>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async resolvePageComment(orgId: string, pageId: string, commentId: string, isResolved = true): Promise<WsPageComment> {
    return this.request<WsPageComment>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments/${commentId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ isResolved }),
    });
  }

  async deletePageComment(orgId: string, pageId: string, commentId: string): Promise<WsPageComment> {
    return this.request<WsPageComment>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // --- Real-Time Collab ---
  async generateCollabToken(orgId: string, pageId: string): Promise<CollabTokenResponse> {
    return this.request<CollabTokenResponse>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/collab/token`, {
      method: 'POST',
    });
  }

  async listCollabSnapshots(orgId: string, pageId: string): Promise<WsPageCollabSnapshot[]> {
    return this.request<WsPageCollabSnapshot[]>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/collab/snapshots`);
  }

  async saveCollabSnapshot(orgId: string, pageId: string, snapshot: any): Promise<any> {
    return this.request<any>(`/api/v1/organizations/${orgId}/workspace/pages/${pageId}/collab/snapshots`, {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });
  }
}

export const createApiClient = (config?: ApiClientConfig) => new BusinessOSApiClient(config);
