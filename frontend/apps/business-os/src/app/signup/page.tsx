'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccessData(data);
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
        <h2 className="text-2xl font-extrabold text-[#141413]">Create your account</h2>
        <p className="text-xs text-[#625F59]">
          Standalone identity without external vendor lock-in.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10">
          {successData ? (
            <div className="space-y-4 text-center">
              <div className="h-10 w-10 rounded-full bg-[#476B3C]/10 text-[#476B3C] flex items-center justify-center mx-auto text-lg font-bold">
                ✓
              </div>
              <h3 className="text-base font-bold text-[#141413]">Account Created</h3>
              <p className="text-xs text-[#625F59]">
                Verification token generated for <strong>{successData.user?.email}</strong>.
              </p>
              {successData.verificationToken && (
                <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E6DC] text-left text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#C15F3C] uppercase">Verification Token (Dev)</span>
                  <p className="font-mono text-[11px] break-all text-[#141413]">{successData.verificationToken}</p>
                </div>
              )}
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={`/verify-email?token=${encodeURIComponent(successData.verificationToken || '')}`}
                  className="rounded-md bg-[#C15F3C] py-2 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors"
                >
                  Verify Email Now →
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] py-2 px-4 text-xs font-medium text-[#141413] hover:bg-[#F4F3EE]"
                >
                  Proceed to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#141413]">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413]">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="alex@acme.inc"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413]">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
                <p className="mt-1 text-[11px] text-[#625F59]">Minimum 8 characters with salt hashing.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-[#E8E6DC] pt-4 text-center">
            <p className="text-xs text-[#625F59]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#C15F3C] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
