'use client';

import * as React from 'react';
import Link from 'next/link';

interface ProductItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  priceAmount: string | number;
  currency: string;
  billingInterval: string;
  features: string[];
}

export default function PricingPage() {
  const [plans, setPlans] = React.useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchPricing() {
      try {
        setIsLoading(true);
        const res = await fetch('http://localhost:3001/api/v1/public/pricing');
        if (!res.ok) {
          throw new Error(`Failed to load plans: ${res.status}`);
        }
        const data = await res.json();
        setPlans(data);
      } catch (err: any) {
        setError(err.message || 'Unable to load dynamic product catalog');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPricing();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6DC] bg-[#F4F3EE] px-3 py-1 text-xs font-medium text-[#C15F3C]">
          <span>Dynamic PostgreSQL Catalog</span>
        </div>
        <h1 className="text-4xl font-extrabold text-[#141413]">
          Transparent, Modular Commercial Plans
        </h1>
        <p className="text-[#625F59] text-base leading-relaxed">
          Select individual standalone applications or unlock the Full Enterprise Suite with guaranteed SLA and data retention.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C]" />
          <p className="text-xs text-[#625F59]">Loading real-time catalog from backend...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-6 text-center max-w-lg mx-auto">
          <p className="text-sm font-semibold text-[#B42318] mb-1">Could not fetch live pricing</p>
          <p className="text-xs text-[#625F59] mb-4">{error}. Ensure the backend service is running.</p>
          <Link
            href="/contact"
            className="inline-block rounded-md bg-[#C15F3C] px-4 py-2 text-xs font-medium text-white hover:bg-[#A84E31]"
          >
            Contact Sales for Pricing
          </Link>
        </div>
      )}

      {!isLoading && !error && plans.length === 0 && (
        <div className="text-center p-12 bg-white rounded-lg border border-dashed border-[#E8E6DC]">
          <p className="text-sm text-[#625F59]">No published plans available in the catalog currently.</p>
        </div>
      )}

      {!isLoading && !error && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border bg-white p-8 shadow-sm flex flex-col justify-between transition-all ${
                plan.code === 'biz-growth'
                  ? 'border-[#C15F3C] ring-2 ring-[#C15F3C]/20'
                  : 'border-[#E8E6DC]'
              }`}
            >
              <div>
                {plan.code === 'biz-growth' && (
                  <span className="inline-block mb-3 rounded-full bg-[#C15F3C] px-3 py-0.5 text-[11px] font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#141413]">{plan.name}</h3>
                <p className="text-xs text-[#625F59] mt-2 min-h-[36px]">{plan.description}</p>

                <div className="mt-6 mb-6 pb-6 border-b border-[#E8E6DC] flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#141413]">
                    ${Number(plan.priceAmount).toFixed(0)}
                  </span>
                  <span className="text-xs text-[#625F59]">
                    /{plan.billingInterval.toLowerCase()}
                  </span>
                </div>

                <div className="space-y-3 mb-8">
                  <span className="text-xs font-semibold text-[#141413] uppercase tracking-wider block">
                    What is included:
                  </span>
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-[#625F59]">
                      <span className="text-[#476B3C] font-bold">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/contact?plan=${encodeURIComponent(plan.code)}`}
                className={`w-full py-2.5 text-center text-xs font-semibold rounded-md transition-colors ${
                  plan.code === 'biz-growth'
                    ? 'bg-[#C15F3C] text-white hover:bg-[#A84E31]'
                    : 'bg-[#F4F3EE] text-[#141413] hover:bg-[#E8E6DC] border border-[#E8E6DC]'
                }`}
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
