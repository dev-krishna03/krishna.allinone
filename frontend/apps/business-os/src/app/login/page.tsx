'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('alex@acme.inc');
  const [password, setPassword] = React.useState('P@ssword123!');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store access token in session storage / memory
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('accessToken', data.tokens.accessToken);
        sessionStorage.setItem('refreshToken', data.tokens.refreshToken);
        if (data.activeOrganization) {
          sessionStorage.setItem('organizationId', data.activeOrganization.id);
        }
      }

      // If user has no organizations yet, guide to onboarding
      if (!data.activeOrganization && (!data.memberships || data.memberships.length === 0)) {
        router.push('/onboarding/create-organization');
      } else {
        router.push('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-[#C15F3C] flex items-center justify-center text-white font-bold text-sm">
            B
          </span>
          <span className="font-bold text-xl tracking-tight text-[#141413]">
            Business<span className="text-[#C15F3C]">OS</span>
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-[#141413]">Sign in to your workspace</h2>
        <p className="text-xs text-[#625F59]">
          Central identity and organization session management.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#141413]">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#141413]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-[#C15F3C] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-[#E8E6DC] pt-4 text-center">
            <p className="text-xs text-[#625F59]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-[#C15F3C] hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
