'use client';

import * as React from 'react';
import Link from 'next/link';

interface UserContext {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    planTier: string;
    status: string;
  };
  permissions: string[];
  allOrganizations?: { id: string; name: string; slug: string }[];
}

export default function BusinessOSDashboard() {
  const [data, setData] = React.useState<UserContext | null>(null);
  const [effectiveNav, setEffectiveNav] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'launcher' | 'settings'>('overview');

  React.useEffect(() => {
    async function loadIdentity() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3001/api/v1/me');
        if (!res.ok) {
          throw new Error(`Failed to load identity: ${res.status}`);
        }
        const json = await res.json();
        setData(json);

        if (json?.organization?.id) {
          try {
            const navRes = await fetch(`http://localhost:3001/api/v1/organizations/${json.organization.id}/entitlements/effective-nav`);
            if (navRes.ok) {
              const navData = await navRes.json();
              setEffectiveNav(navData.availableApps || navData);
            }
          } catch (_) {
            // graceful fallback
          }
        }
      } catch (err: any) {
        setError(err.message || 'Unable to connect to platform API');
      } finally {
        setLoading(false);
      }
    }
    loadIdentity();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Initializing Business OS Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5] p-6">
        <div className="rounded-xl border border-[#B42318]/30 bg-white p-8 max-w-md text-center shadow-sm">
          <div className="h-10 w-10 rounded-full bg-[#B42318]/10 text-[#B42318] flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-[#141413]">Workspace Connection Failed</h2>
          <p className="text-xs text-[#625F59] mt-2 mb-4">
            {error || 'No active organization session found. Make sure backend is running on port 3001.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { user, organization, permissions } = data;

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF9F5]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E8E6DC] bg-[#F4F3EE] flex flex-col justify-between">
        <div>
          {/* Workspace Switcher */}
          <div className="p-4 border-b border-[#E8E6DC]">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded bg-[#C15F3C] flex items-center justify-center text-white font-bold text-xs">
                B
              </span>
              <span className="font-bold text-sm text-[#141413]">Business OS</span>
            </div>
            <div className="rounded-md bg-white border border-[#E8E6DC] p-2.5 shadow-xs">
              <div className="text-[10px] uppercase font-semibold text-[#625F59]">Current Workspace</div>
              <div className="font-bold text-xs text-[#141413] truncate">{organization.name}</div>
              <div className="inline-block mt-1 text-[10px] font-semibold text-[#476B3C] bg-[#476B3C]/10 px-1.5 py-0.5 rounded">
                Plan: {organization.planTier}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#C15F3C] text-white'
                  : 'text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]'
              }`}
            >
              <span>Workspace Dashboard</span>
              <span>◈</span>
            </button>

            <Link
              href="/workspace"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Documents &amp; Workspace</span>
              <span className="text-[10px] bg-[#C15F3C]/10 text-[#C15F3C] font-bold px-1.5 rounded">Docs</span>
            </Link>

            <button
              onClick={() => setActiveTab('launcher')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                activeTab === 'launcher'
                  ? 'bg-[#C15F3C] text-white'
                  : 'text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]'
              }`}
            >
              <span>Application Launcher</span>
              <span className="text-[10px] bg-white/20 px-1.5 rounded">Apps</span>
            </button>

            <Link
              href="/app/marketplace"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>App Marketplace</span>
              <span className="text-[10px] bg-[#C15F3C]/10 text-[#C15F3C] font-bold px-1.5 rounded">14 Apps</span>
            </Link>

            <Link
              href="/settings/subscription"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Subscription & Plans</span>
              <span>💳</span>
            </Link>

            <Link
              href="/settings/licenses"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Seat Licenses</span>
              <span>🪑</span>
            </Link>

            <Link
              href="/settings/members"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Team Members</span>
              <span>👥</span>
            </Link>

            <Link
              href="/settings/security"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Security & Sessions</span>
              <span>🛡</span>
            </Link>

            <a
              href="http://localhost:3000"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Public Website</span>
              <span>↗</span>
            </a>

            <a
              href="http://localhost:3003"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>SaaS Super Admin</span>
              <span>⚙</span>
            </a>

            <a
              href="http://localhost:3004"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Developer Console</span>
              <span>💻</span>
            </a>

            <a
              href="http://localhost:3005"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[#625F59] hover:bg-[#E8E6DC] hover:text-[#141413]"
            >
              <span>Client Portal</span>
              <span>📁</span>
            </a>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-[#E8E6DC] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#C15F3C] text-white flex items-center justify-center font-bold text-xs">
              {user.fullName.charAt(0)}
            </div>
            <div className="truncate">
              <div className="font-semibold text-xs text-[#141413] truncate">{user.fullName}</div>
              <div className="text-[11px] text-[#625F59] truncate">{user.email}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#625F59]">
            <span>Role: <strong className="text-[#141413]">{user.role}</strong></span>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.href = '/login';
              }}
              className="text-[#B42318] hover:underline font-semibold"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[#E8E6DC] bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#625F59]">
            <span className="font-semibold text-[#141413]">{organization.name}</span>
            <span>/</span>
            <span>{activeTab === 'overview' ? 'Overview' : 'Apps Catalog'}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#625F59] hover:border-[#D5D2C5]"
            >
              <span>Search commands...</span>
              <kbd className="rounded bg-[#E8E6DC] px-1.5 py-0.5 text-[10px] text-[#141413]">⌘K</kbd>
            </button>
            <div className="h-4 w-px bg-[#E8E6DC]" />
            <span className="text-xs text-[#476B3C] font-semibold">● Live Sync</span>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 max-w-6xl">
              {/* Organization Status Banner */}
              <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#141413]">Welcome to {organization.name}</h2>
                  <p className="text-xs text-[#625F59] mt-1">
                    Tenant ID: <code className="bg-[#F4F3EE] px-1 py-0.5 rounded text-[#C15F3C]">{organization.id}</code>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#476B3C]/10 text-[#476B3C]">
                    Subscription: {organization.planTier}
                  </span>
                  <button
                    onClick={() => setActiveTab('launcher')}
                    className="rounded-md bg-[#C15F3C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A84E31]"
                  >
                    Open App Launcher
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border border-[#E8E6DC] bg-white p-5">
                  <div className="text-xs font-medium text-[#625F59]">Tenant Seats</div>
                  <div className="text-2xl font-extrabold text-[#141413] mt-2">1 / 25</div>
                  <div className="text-[11px] text-[#476B3C] mt-1">Growth Tier Entitlement</div>
                </div>

                <div className="rounded-lg border border-[#E8E6DC] bg-white p-5">
                  <div className="text-xs font-medium text-[#625F59]">Active Entitlements</div>
                  <div className="text-2xl font-extrabold text-[#141413] mt-2">6 Modules</div>
                  <div className="text-[11px] text-[#625F59] mt-1">Outbox, Audit, Catalog, Portal</div>
                </div>

                <div className="rounded-lg border border-[#E8E6DC] bg-white p-5">
                  <div className="text-xs font-medium text-[#625F59]">Permissions Scope</div>
                  <div className="text-2xl font-extrabold text-[#141413] mt-2">{permissions.length} Grants</div>
                  <div className="text-[11px] text-[#625F59] mt-1">Role: {user.role}</div>
                </div>

                <div className="rounded-lg border border-[#E8E6DC] bg-white p-5">
                  <div className="text-xs font-medium text-[#625F59]">Platform Status</div>
                  <div className="text-2xl font-extrabold text-[#476B3C] mt-2">100%</div>
                  <div className="text-[11px] text-[#476B3C] mt-1">All Daemons Operational</div>
                </div>
              </div>

              {/* Entitled Permissions List */}
              <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#141413] mb-3">Assigned User Entitlements & Scopes</h3>
                <div className="flex flex-wrap gap-2">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-[#F4F3EE] border border-[#E8E6DC] px-2.5 py-1 text-xs font-mono text-[#625F59]"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'launcher' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#141413]">Application Launcher</h2>
                  <p className="text-xs text-[#625F59] mt-1">
                    Launch entitled business applications inside your tenant boundary.
                  </p>
                </div>
                <Link
                  href="/app/marketplace"
                  className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#A84E31] transition"
                >
                  Browse App Marketplace (14 Modules) →
                </Link>
              </div>

              {effectiveNav.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {effectiveNav.map((app) => {
                    const canAccess = app.isEntitled && (!app.requiresSeat || app.hasSeat);
                    return (
                      <div
                        key={app.slug}
                        className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs hover:border-[#C15F3C] transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C15F3C]">
                              {app.category}
                            </span>
                            {app.isCore ? (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                Core
                              </span>
                            ) : app.isEntitled ? (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Licensed
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Add-on
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-[#141413]">{app.name}</h3>
                          <p className="text-xs text-[#625F59] mt-1 line-clamp-2">
                            {app.name} independent Business OS module with full multitenant data isolation.
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#E8E6DC]">
                          {canAccess ? (
                            <Link
                              href={app.launchUrl}
                              className="w-full block text-center py-2 rounded-md text-xs font-semibold bg-[#FAF9F5] border border-[#E8E6DC] text-[#141413] hover:bg-[#F4F3EE] transition"
                            >
                              Open Application →
                            </Link>
                          ) : (
                            <Link
                              href="/app/marketplace"
                              className="w-full block text-center py-2 rounded-md text-xs font-semibold bg-[#C15F3C] text-white hover:bg-[#A84E31] transition"
                            >
                              Start Free Trial / Subscribe
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs hover:border-[#C15F3C] transition-colors">
                    <span className="text-xs font-semibold text-[#C15F3C]">Operations</span>
                    <h3 className="text-base font-bold text-[#141413] mt-1">Core Financial Ledger</h3>
                    <p className="text-xs text-[#625F59] mt-2 mb-4">
                      Decimal-accurate multi-currency ledger, invoice generation, and bank reconciliations.
                    </p>
                    <span className="text-[11px] font-semibold text-[#476B3C] bg-[#476B3C]/10 px-2 py-0.5 rounded">
                      Entitled
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs hover:border-[#C15F3C] transition-colors">
                    <span className="text-xs font-semibold text-[#2F5C83]">Client Engagement</span>
                    <h3 className="text-base font-bold text-[#141413] mt-1">External Client Portal</h3>
                    <p className="text-xs text-[#625F59] mt-2 mb-4">
                      Secure document sharing and project status views for your external clients.
                    </p>
                    <a
                      href="http://localhost:3005"
                      className="inline-block text-xs font-semibold text-[#C15F3C] hover:underline"
                    >
                      Open Client Portal →
                    </a>
                  </div>

                  <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs hover:border-[#C15F3C] transition-colors">
                    <span className="text-xs font-semibold text-[#996000]">Developer</span>
                    <h3 className="text-base font-bold text-[#141413] mt-1">Developer Console</h3>
                    <p className="text-xs text-[#625F59] mt-2 mb-4">
                      Manage API keys, inspect transactional outbox replay, and monitor runtime diagnostics.
                    </p>
                    <a
                      href="http://localhost:3004"
                      className="inline-block text-xs font-semibold text-[#C15F3C] hover:underline"
                    >
                      Open Diagnostics Console →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E8E6DC] bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E8E6DC] pb-3">
              <input
                type="text"
                autoFocus
                placeholder="Type a command or jump to screen..."
                className="w-full text-sm outline-none text-[#141413] placeholder:text-[#8A867D]"
              />
              <button
                onClick={() => setShowCommandPalette(false)}
                className="text-xs text-[#625F59] hover:text-[#141413] ml-2"
              >
                ESC
              </button>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#F4F3EE] flex justify-between"
              >
                <span>Jump to Workspace Overview</span>
                <span className="text-[#8A867D]">Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('launcher');
                  setShowCommandPalette(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#F4F3EE] flex justify-between"
              >
                <span>Open Application Launcher</span>
                <span className="text-[#8A867D]">Apps</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
