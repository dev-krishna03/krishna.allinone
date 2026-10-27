'use client';

import * as React from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [resetComplete, setResetComplete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setSubmitted(true);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Reset failed');
      }

      setResetComplete(true);
    } catch (err: any) {
      setError(err.message || 'Password update failed');
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
        <h2 className="text-2xl font-extrabold text-[#141413]">Password Recovery</h2>
        <p className="text-xs text-[#625F59]">
          Single-use, time-limited token recovery with session revocation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10">
          {resetComplete ? (
            <div className="text-center space-y-4">
              <div className="h-10 w-10 rounded-full bg-[#476B3C]/10 text-[#476B3C] flex items-center justify-center mx-auto text-lg font-bold">
                ✓
              </div>
              <h3 className="text-base font-bold text-[#141413]">Password Updated</h3>
              <p className="text-xs text-[#625F59]">
                All prior sessions have been revoked. Sign in with your new password.
              </p>
              <Link
                href="/login"
                className="inline-block rounded-md bg-[#C15F3C] py-2 px-4 text-xs font-semibold text-white hover:bg-[#A84E31]"
              >
                Sign In Now
              </Link>
            </div>
          ) : submitted ? (
            <form className="space-y-4" onSubmit={handleConfirmReset}>
              <div className="rounded-md bg-[#476B3C]/10 border border-[#476B3C]/20 p-3 text-xs text-[#476B3C]">
                If this email exists in our registry, a recovery token has been issued.
              </div>

              {resetToken && (
                <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E6DC] text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#C15F3C]">Dev Recovery Token:</span>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full text-[11px] font-mono bg-white border border-[#E8E6DC] p-1 rounded"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#141413]">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRequestReset}>
              {error && (
                <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#141413]">Enter your work email</label>
                <input
                  type="email"
                  required
                  placeholder="alex@acme.inc"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
              >
                {loading ? 'Dispatching Token...' : 'Send Recovery Token'}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-[#E8E6DC] pt-4 text-center">
            <Link href="/login" className="text-xs text-[#625F59] hover:text-[#141413]">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
