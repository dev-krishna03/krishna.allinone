'use client';

import * as React from 'react';

export default function ContactPage() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    companyName: '',
    productInterest: 'biz-growth',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/public/demo-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'marketing-contact-form',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with code ${res.status}`);
      }

      const data = await res.json();
      setSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center space-y-3 mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#141413]">
          Request an Architecture Demo
        </h1>
        <p className="text-[#625F59] text-sm max-w-lg mx-auto">
          Get in touch with our enterprise systems architects to discuss custom deployment, data sovereignty, or dedicated infrastructure.
        </p>
      </div>

      <div className="rounded-xl border border-[#E8E6DC] bg-white p-8 sm:p-10 shadow-sm">
        {success ? (
          <div className="text-center py-12 space-y-4">
            <div className="h-12 w-12 rounded-full bg-[#476B3C]/10 text-[#476B3C] flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[#141413]">Demo Request Received</h3>
            <p className="text-sm text-[#625F59] max-w-md mx-auto">
              Thank you, <strong>{success.name}</strong>. Your enquiry for <strong>{success.companyName}</strong> has been logged with ID{' '}
              <code className="text-xs bg-[#F4F3EE] px-1.5 py-0.5 rounded font-mono text-[#C15F3C]">
                {success.id}
              </code>{' '}
              and queued via our Transactional Outbox.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSuccess(null);
                  setFormData({ name: '', email: '', companyName: '', productInterest: 'biz-growth', message: '' });
                }}
                className="rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-4 py-2 text-xs font-medium text-[#141413] hover:bg-[#F4F3EE]"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-[#B42318]/20 bg-[#B42318]/5 p-4 text-xs text-[#B42318]">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#141413]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#141413]">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#141413]">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Global Inc"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#141413]">Product of Interest</label>
                <select
                  value={formData.productInterest}
                  onChange={(e) => setFormData({ ...formData, productInterest: e.target.value })}
                  className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
                >
                  <option value="biz-starter">Starter Business OS ($49/mo)</option>
                  <option value="biz-growth">Growth Suite ($149/mo)</option>
                  <option value="biz-enterprise">Enterprise Monolith ($499/mo)</option>
                  <option value="custom">Custom Multi-tenant Bundle</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#141413]">Deployment Requirements / Notes *</label>
              <textarea
                required
                rows={4}
                placeholder="Tell us about your team size, integration requirements, and target timeline..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-md border border-[#E8E6DC] bg-white px-3 py-2 text-sm text-[#141413] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto rounded-md bg-[#C15F3C] px-8 py-3 text-sm font-semibold text-white hover:bg-[#A84E31] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Demo Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
