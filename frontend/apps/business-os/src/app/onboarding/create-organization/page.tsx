'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [legalName, setLegalName] = React.useState('');
  const [timezone, setTimezone] = React.useState('UTC');
  const [currency, setCurrency] = React.useState('USD');
  const [country, setCountry] = React.useState('US');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;

    try {
      const res = await fetch('http://localhost:3001/api/v1/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          slug,
          legalName: legalName || undefined,
          timezone,
          currency,
          country,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create organization');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('organizationId', data.id);
      }

      router.push(`/onboarding/invite?orgId=${data.id}&orgName=${encodeURIComponent(data.name)}`);
    } catch (err: any) {
      setError(err.message || 'Creation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DC] bg-[#F4F3EE] px-3 py-1 text-xs font-semibold text-[#C15F3C]">
          <span>Step 1 of 2: Organization Setup</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#141413]">Provision your Organization</h2>
        <p className="text-xs text-[#625F59]">
          SaaS tenant configuration, isolated data partition, and default Owner assignment.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E6DC] rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded bg-[#B42318]/5 border border-[#B42318]/20 text-xs text-[#B42318]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#141413]">Organization Name *</label>
              <input
                type="text"
                required
                placeholder="Acme Global Inc"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413]">URL Slug *</label>
              <div className="mt-1 flex rounded-md shadow-xs">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[#E8E6DC] bg-[#F4F3EE] text-xs text-[#625F59]">
                  app.businessos.internal/
                </span>
                <input
                  type="text"
                  required
                  placeholder="acme-global"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="block w-full rounded-r-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm font-mono text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413]">Legal Entity Name (Optional)</label>
              <input
                type="text"
                placeholder="Acme Global Corporation LLC"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#141413]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413]">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#141413]">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-xs text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="IN">India</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#C15F3C] py-2.5 px-4 text-xs font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
              >
                {loading ? 'Provisioning Tenant...' : 'Continue to Team Invites →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
