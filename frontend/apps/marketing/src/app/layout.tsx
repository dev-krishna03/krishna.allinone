import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Unified Business OS | The Modular Operating System for Modern Enterprises',
  description: 'Extensible multitenant modular-monolith Business OS for operations, finance, catalog, and developer tooling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAF9F5] text-[#141413] flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b border-[#E8E6DC] bg-[#FAF9F5]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-[#C15F3C] flex items-center justify-center text-white font-bold text-lg">
                B
              </span>
              <span className="font-bold text-lg tracking-tight text-[#141413]">
                Business<span className="text-[#C15F3C]">OS</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#625F59]">
              <Link href="/features" className="hover:text-[#C15F3C] transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-[#C15F3C] transition-colors">
                Pricing
              </Link>
              <Link href="/contact" className="hover:text-[#C15F3C] transition-colors">
                Contact & Demo
              </Link>
              <a href="http://localhost:3002" className="hover:text-[#C15F3C] transition-colors">
                App
              </a>
              <a href="http://localhost:3003" className="hover:text-[#C15F3C] transition-colors text-xs bg-[#F4F3EE] px-2.5 py-1 rounded-full border border-[#E8E6DC]">
                Super Admin
              </a>
              <a href="http://localhost:3004" className="hover:text-[#C15F3C] transition-colors text-xs bg-[#F4F3EE] px-2.5 py-1 rounded-full border border-[#E8E6DC]">
                Developer
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/contact"
                className="rounded-md bg-[#C15F3C] px-4 py-2 text-sm font-medium text-white hover:bg-[#A84E31] transition-colors shadow-sm"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#E8E6DC] bg-[#F4F3EE] py-12 text-[#625F59]">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-6 w-6 rounded bg-[#C15F3C] flex items-center justify-center text-white font-bold text-xs">
                  B
                </span>
                <span className="font-bold text-sm text-[#141413]">Business OS</span>
              </div>
              <p className="text-xs leading-relaxed">
                Extensible multitenant modular-monolith Business Operating System for high-performing modern enterprises.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141413] mb-3">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/features" className="hover:text-[#C15F3C]">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-[#C15F3C]">Pricing Plans</Link></li>
                <li><a href="http://localhost:3002" className="hover:text-[#C15F3C]">Customer Dashboard</a></li>
                <li><a href="http://localhost:3005" className="hover:text-[#C15F3C]">Client Portal</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141413] mb-3">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="http://localhost:3003" className="hover:text-[#C15F3C]">SaaS Super Admin</a></li>
                <li><a href="http://localhost:3004" className="hover:text-[#C15F3C]">Developer Diagnostics</a></li>
                <li><a href="http://localhost:3001/api/docs" target="_blank" className="hover:text-[#C15F3C]">REST API Docs (OpenAPI)</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141413] mb-3">Contact</h4>
              <p className="text-xs leading-relaxed mb-3">
                Have questions or need enterprise deployment support? Reach out to our team.
              </p>
              <Link href="/contact" className="inline-block text-xs font-semibold text-[#C15F3C] hover:underline">
                Schedule an Architecture Briefing →
              </Link>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-[#E8E6DC] text-center text-xs text-[#8A867D]">
            © {new Date().getFullYear()} Unified Business OS. All rights reserved. Built with Claude Warm Earthy Design Tokens.
          </div>
        </footer>
      </body>
    </html>
  );
}
