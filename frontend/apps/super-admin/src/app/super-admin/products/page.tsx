'use client';

import * as React from 'react';
import Link from 'next/link';
import { SuperAdminNav } from '../../../components/super-admin-nav';

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  status: string;
  isCore: boolean;
  dependencies: string[];
  features?: {
    id: string;
    key: string;
    name: string;
    type: string;
    defaultValue: any;
  }[];
  _count?: {
    entitlements: number;
    plans: number;
  };
}

export default function SuperAdminProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [newFeatureKey, setNewFeatureKey] = React.useState('');
  const [newFeatureName, setNewFeatureName] = React.useState('');
  const [newFeatureType, setNewFeatureType] = React.useState<'BOOLEAN' | 'LIMIT' | 'METERED'>('BOOLEAN');
  const [submittingFeature, setSubmittingFeature] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/v1/platform/products');
      if (!res.ok) throw new Error('Failed to fetch platform products');
      const data = await res.json();
      setProducts(data);
      if (data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0]);
      } else if (selectedProduct) {
        const updated = data.find((p: Product) => p.id === selectedProduct.id);
        if (updated) setSelectedProduct(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading product catalog');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newFeatureKey || !newFeatureName) return;

    try {
      setSubmittingFeature(true);
      const res = await fetch(`http://localhost:3001/api/v1/platform/products/${selectedProduct.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newFeatureKey,
          name: newFeatureName,
          type: newFeatureType,
          defaultValue: newFeatureType === 'BOOLEAN' ? true : 100,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to add product feature');
      }

      setMsg(`Feature "${newFeatureName}" added successfully to ${selectedProduct.name}!`);
      setNewFeatureKey('');
      setNewFeatureName('');
      await fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Error adding feature');
    } finally {
      setSubmittingFeature(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F5]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C] mx-auto" />
          <p className="text-xs text-[#625F59]">Loading Platform Product Catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Header */}
      <header className="border-b border-[#E8E6DC] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded bg-[#B42318] text-white flex items-center justify-center font-bold text-sm">
              SA
            </span>
            <div>
              <h1 className="font-bold text-sm text-[#141413]">SaaS Super Admin</h1>
              <p className="text-[11px] text-[#625F59]">Platform Commercial Architecture & Catalog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3002"
              className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#F4F3EE]"
            >
              Customer Business OS →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <SuperAdminNav />

        {error && (
          <div className="rounded-lg border border-[#B42318]/30 bg-[#B42318]/5 p-4 text-xs text-[#B42318]">
            <strong>Error:</strong> {error}
          </div>
        )}

        {msg && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="font-bold">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#141413]">Platform Modular Applications</h2>
            <p className="text-xs text-[#625F59]">
              14 independent Business OS products with lifecycle tracking, dependency graphs, and fine-grained feature flags
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-white border border-[#E8E6DC] px-3 py-1 text-xs font-semibold text-[#141413]">
            {products.length} Registered Products
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="lg:col-span-2 rounded-xl border border-[#E8E6DC] bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E8E6DC] bg-[#FAF9F5] flex justify-between items-center">
              <span className="text-xs font-bold text-[#141413]">Catalog Registry</span>
              <span className="text-[11px] text-[#625F59]">Click a module to view/manage features</span>
            </div>
            <div className="divide-y divide-[#E8E6DC] max-h-[600px] overflow-y-auto">
              {products.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-[#FAF9F5] border-l-4 border-l-[#C15F3C]' : 'hover:bg-[#FAF9F5]/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#141413]">{p.name}</span>
                        <span className="text-[10px] text-[#625F59] font-mono">({p.slug})</span>
                        {p.isCore && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Core
                          </span>
                        )}
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#625F59] line-clamp-1">{p.description}</p>
                      {p.dependencies.length > 0 && (
                        <div className="text-[11px] text-[#A09D95]">
                          Dependencies: <span className="text-[#141413]">{p.dependencies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-[#625F59]">
                      <span className="font-semibold text-[#141413]">{p.features?.length || 0}</span> features
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Inspection & Creation */}
          <div className="rounded-xl border border-[#E8E6DC] bg-white p-5 shadow-xs space-y-4">
            {selectedProduct ? (
              <>
                <div className="border-b border-[#E8E6DC] pb-3">
                  <div className="text-[10px] uppercase font-bold text-[#A09D95] tracking-wider">
                    {selectedProduct.category} MODULE
                  </div>
                  <h3 className="font-bold text-base text-[#141413]">{selectedProduct.name}</h3>
                  <p className="text-xs text-[#625F59] mt-1">{selectedProduct.description}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#141413]">Registered Features</h4>
                  {selectedProduct.features && selectedProduct.features.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProduct.features.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-lg border border-[#E8E6DC] bg-[#FAF9F5] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#141413]">{f.name}</span>
                            <div className="font-mono text-[10px] text-[#625F59]">{f.key}</div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-white border border-[#E8E6DC] rounded text-[#141413]">
                            {f.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#625F59]">No features defined yet.</p>
                  )}
                </div>

                {/* Add Feature Form */}
                <form onSubmit={handleAddFeature} className="border-t border-[#E8E6DC] pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#141413]">Add Product Feature</h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Feature Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Advanced Pipeline Automations"
                      value={newFeatureName}
                      onChange={(e) => setNewFeatureName(e.target.value)}
                      required
                      className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Feature Key</label>
                    <input
                      type="text"
                      placeholder="e.g., crm.advanced_automations"
                      value={newFeatureKey}
                      onChange={(e) => setNewFeatureKey(e.target.value)}
                      required
                      className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white font-mono text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#625F59] mb-1">Type</label>
                    <select
                      value={newFeatureType}
                      onChange={(e) => setNewFeatureType(e.target.value as any)}
                      className="w-full text-xs p-2 rounded border border-[#E8E6DC] bg-white text-[#141413] focus:border-[#C15F3C] focus:outline-none"
                    >
                      <option value="BOOLEAN">BOOLEAN (Flag / Toggle)</option>
                      <option value="LIMIT">LIMIT (Max Records / Seats)</option>
                      <option value="METERED">METERED (Storage / API Calls)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeature}
                    className="w-full py-2 bg-[#C15F3C] text-white rounded-md text-xs font-semibold hover:bg-[#A84E31] disabled:opacity-50 transition"
                  >
                    {submittingFeature ? 'Adding Feature...' : 'Register Feature'}
                  </button>
                </form>
              </>
            ) : (
              <p className="text-xs text-[#625F59]">Select a product to view details.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
