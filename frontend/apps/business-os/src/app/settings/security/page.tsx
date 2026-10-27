'use client';

import * as React from 'react';
import Link from 'next/link';
import { SettingsNav } from '../settings-nav';

interface SessionItem {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const res = await fetch('http://localhost:3001/api/v1/me/sessions', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load active sessions');
      }

      const data = await res.json();
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Error loading sessions');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const res = await fetch(`http://localhost:3001/api/v1/me/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Revocation failed');

      setActionMessage('Session revoked successfully.');
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out from all devices?')) return;
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const res = await fetch('http://localhost:3001/api/v1/me/sessions', {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Logout all failed');

      setActionMessage('All sessions revoked. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Top Bar */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-xs font-semibold text-[#625F59] hover:text-[#C15F3C]">
              ← Dashboard
            </Link>
            <span className="text-xs text-[#8A867D]">/</span>
            <h1 className="font-bold text-sm text-[#141413]">Security & Active Sessions</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings/members"
              className="text-xs text-[#625F59] hover:text-[#C15F3C] font-medium"
            >
              Team Members →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <SettingsNav />

        <div>
          <h2 className="text-2xl font-bold text-[#141413]">Security Credentials & Sessions</h2>
          <p className="text-xs text-[#625F59] mt-1">
            Manage your authenticated devices, refresh session tokens, and security events.
          </p>
        </div>

        {actionMessage && (
          <div className="p-3 rounded-md bg-[#476B3C]/10 border border-[#476B3C]/20 text-xs text-[#476B3C]">
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {/* Active Sessions Card */}
        <div className="rounded-xl border border-[#E8E6DC] bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141413]">Active Device Sessions</h3>
              <p className="text-xs text-[#625F59]">
                Sessions with valid rotating refresh tokens and access grants.
              </p>
            </div>
            <button
              onClick={handleLogoutAll}
              className="rounded-md border border-[#B42318]/30 bg-[#B42318]/5 px-3 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#B42318]/10"
            >
              Terminate All Sessions
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#625F59]">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#625F59]">No active sessions found.</div>
          ) : (
            <div className="divide-y divide-[#E8E6DC]">
              {sessions.map((session) => (
                <div key={session.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#141413]">
                        {session.userAgent || 'Web Browser'}
                      </span>
                      {session.isCurrent && (
                        <span className="rounded bg-[#476B3C]/10 text-[#476B3C] px-2 py-0.5 text-[10px] font-semibold">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#625F59] mt-0.5">
                      IP: <span className="font-mono">{session.ipAddress || '127.0.0.1'}</span> • Started:{' '}
                      {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-xs font-semibold text-[#B42318] hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token Strategy & Security Policy Notice */}
        <div className="rounded-xl border border-[#E8E6DC] bg-[#F4F3EE] p-6 space-y-3">
          <h3 className="text-sm font-bold text-[#141413]">Tenant Isolation & Token Security Policy</h3>
          <ul className="text-xs text-[#625F59] space-y-2 list-disc pl-5">
            <li>Access tokens expire after 15 minutes.</li>
            <li>Refresh tokens rotate upon every use. Token replay automatically revokes the full token family.</li>
            <li>Database queries are strictly constrained by <code className="bg-white px-1 rounded font-mono">organization_id</code>.</li>
            <li>Passwords are hashed with bcrypt and 10 salt rounds.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
