'use client';

import * as React from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  isCore: boolean;
  status: string;
  dependencies: string[];
  features?: { id: string; key: string; name: string; type: string }[];
  plans?: { id: string; name: string; edition: string; trialDays: number; includedSeats: number }[];
}

interface Bundle {
  id: string;
  slug: string;
  name: string;
  description: string;
  items: { product: { slug: string; name: string } }[];
  plans?: { id: string; name: string; edition: string; trialDays: number; includedSeats: number }[];
}

interface Entitlement {
  id: string;
  status: string;
  productId?: string | null;
  bundleId?: string | null;
  product?: { slug: string };
  bundle?: { slug: string };
}

export default function MarketplacePage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [bundles, setBundles] = React.useState<Bundle[]>([]);
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [loading, setLoading] = React.useState(true);
  const [orgId, setOrgId] = React.useState<string>('');
  const [processingSlug, setProcessingSlug] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('http://localhost:3001/api/v1/me');
      if (!meRes.ok) throw new Error('Could not retrieve workspace identity');
      const meData = await meRes.json();
      const currentOrgId = meData.organization.id;
      setOrgId(currentOrgId);

      const [prodRes, bundleRes, entRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/platform/products'),
        fetch('http://localhost:3001/api/v1/platform/bundles'),
        fetch(`http://localhost:3001/api/v1/organizations/${currentOrgId}/entitlements`),
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (bundleRes.ok) setBundles(await bundleRes.json());
      if (entRes.ok) setEntitlements(await entRes.json());
    } catch (err: any) {
      setMessage({ text: err.message || 'Error loading marketplace catalog', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const isSubscribed = (slug: string) => {
    // Check direct product entitlement
    const hasDirect = entitlements.some(
      (e) => e.product?.slug === slug && ['ACTIVE', 'TRIAL'].includes(e.status)
    );
    if (hasDirect) return true;

    // Check bundle entitlement (e.g., Full Suite)
    const hasBundle = entitlements.some(
      (e) => e.bundleId && ['ACTIVE', 'TRIAL'].includes(e.status)
    );
    return hasBundle;
  };

  const handleActivate = async (product: Product) => {
    try {
      setProcessingSlug(product.slug);
      const plan = product.plans && product.plans.length > 0 ? product.plans[0] : null;

      const res = await fetch(`http://localhost:3001/api/v1/organizations/${orgId}/entitlements/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          planId: plan ? plan.id : undefined,
          assignedSeatsLimit: plan?.includedSeats || 5,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Activation failed');
      }

      setMessage({ text: `Activated 14-day trial for ${product.name}!`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Activation failed', type: 'error' });
    } finally {
      setProcessingSlug(null);
    }
  };

  const categories = ['ALL', 'CORE', 'PRODUCTIVITY', 'OPERATIONS', 'FINANCE', 'PLATFORM'];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category.toUpperCase() === selectedCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Business OS App Marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/app" className="text-xs text-[#625F59] hover:underline">
                Dashboard
              </Link>
              <span className="text-xs text-[#E8E6DC]">/</span>
              <span className="text-xs font-semibold text-[#141413]">Marketplace</span>
            </div>
            <h1 className="text-2xl font-bold text-[#141413]">Business OS Application Catalog</h1>
            <p className="text-xs text-[#625F59] mt-0.5">
              Explore and license independent business modules, productivity apps, and Full Suite commercial bundles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/subscription"
              className="rounded-lg border border-[#E8E6DC] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE] transition"
            >
              Manage Subscriptions
            </Link>
            <Link
              href="/settings/licenses"
              className="rounded-lg bg-[#C15F3C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#A84E31] transition"
            >
              Seat Allocations
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3.5 text-xs flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        {/* Commercial Bundles Banner */}
        {bundles.length > 0 && (
          <div className="rounded-xl border border-[#C15F3C]/30 bg-gradient-to-r from-[#FAF9F5] to-[#F4F3EE] p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C15F3C] text-white px-2 py-0.5 rounded-full">
                  All-in-One Commercial Bundle
                </span>
                <h2 className="text-lg font-bold text-[#141413] mt-2">{bundles[0].name}</h2>
                <p className="text-xs text-[#625F59] mt-1 max-w-xl">
                  {bundles[0].description} Includes all 14 independent platform modules with unified billing and cross-app workflows.
                </p>
              </div>
              <Link
                href="/settings/subscription"
                className="whitespace-nowrap rounded-lg bg-[#C15F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A84E31] transition shadow-xs"
              >
                View Bundle Pricing →
              </Link>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'bg-white border border-[#E8E6DC] text-[#625F59] hover:text-[#141413]'
              }`}
            >
              {cat === 'ALL' ? 'All Applications' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const subscribed = isSubscribed(product.slug);
            const isProcessing = processingSlug === product.slug;

            return (
              <div
                key={product.id}
                className="rounded-xl border border-[#E8E6DC] bg-white p-5 flex flex-col justify-between hover:border-[#C15F3C]/40 transition shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] flex items-center justify-center font-bold text-[#C15F3C] text-sm">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                    {product.isCore ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">
                        Core Included
                      </span>
                    ) : subscribed ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Subscribed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        14-Day Trial
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#141413]">{product.name}</h3>
                    <p className="text-xs text-[#625F59] mt-1 line-clamp-2">{product.description}</p>
                  </div>

                  {product.dependencies && product.dependencies.length > 0 && (
                    <div className="text-[11px] text-[#A09D95]">
                      Depends on:{' '}
                      <span className="font-medium text-[#625F59]">
                        {product.dependencies.join(', ')}
                      </span>
                    </div>
                  )}

                  {product.features && product.features.length > 0 && (
                    <div className="pt-2 border-t border-[#E8E6DC] space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A09D95]">
                        Key Features
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 3).map((f) => (
                          <span
                            key={f.id}
                            className="text-[10px] bg-[#FAF9F5] border border-[#E8E6DC] text-[#625F59] px-2 py-0.5 rounded"
                          >
                            {f.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8E6DC]">
                  {subscribed || product.isCore ? (
                    <Link
                      href={`/app?module=${product.slug}`}
                      className="w-full block text-center py-2 rounded-md text-xs font-semibold bg-[#FAF9F5] border border-[#E8E6DC] text-[#141413] hover:bg-[#F4F3EE] transition"
                    >
                      Open Application
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleActivate(product)}
                      disabled={isProcessing}
                      className="w-full py-2 rounded-md text-xs font-semibold bg-[#C15F3C] text-white hover:bg-[#A84E31] disabled:opacity-50 transition shadow-xs"
                    >
                      {isProcessing ? 'Activating Trial...' : 'Start 14-Day Free Trial'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
