'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = React.useState(searchParams.get('token') || '');
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Verification failed');
      }

      setVerified(true);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10">
      {verified ? (
        <div className="text-center space-y-4">
          <div className="h-10 w-10 rounded-full bg-[#476B3C]/10 text-[#476B3C] flex items-center justify-center mx-auto text-lg font-bold">
            ✓
          </div>
          <h3 className="text-base font-bold text-[#141413]">Email Verified</h3>
          <p className="text-xs text-[#625F59]">
            Your identity is verified. You can now access all tenant features.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[#C15F3C] py-2 px-4 text-xs font-semibold text-white hover:bg-[#A84E31]"
          >
            Sign in to Workspace
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleVerify}>
          {error && (
            <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#141413]">Verification Token</label>
            <input
              type="text"
              required
              placeholder="Paste verification token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm font-mono text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Confirm Verification'}
          </button>
        </form>
      )}

      <div className="mt-6 border-t border-[#E8E6DC] pt-4 text-center">
        <Link href="/login" className="text-xs text-[#625F59] hover:text-[#141413]">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
        <h2 className="text-2xl font-extrabold text-[#141413]">Verify Email Address</h2>
        <p className="text-xs text-[#625F59]">
          Cryptographic token confirmation and event dispatch.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <React.Suspense fallback={<div className="p-8 text-center text-xs text-[#625F59]">Loading...</div>}>
          <VerifyEmailContent />
        </React.Suspense>
      </div>
    </div>
  );
}
