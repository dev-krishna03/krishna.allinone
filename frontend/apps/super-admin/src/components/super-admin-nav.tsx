'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SuperAdminNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview & Tenancy', href: '/super-admin' },
    { label: 'Product Catalog', href: '/super-admin/products' },
    { label: 'Plans & Commercial Editions', href: '/super-admin/plans' },
    { label: 'Price Books & Versions', href: '/super-admin/pricing' },
  ];

  return (
    <div className="border-b border-[#E8E6DC] mb-6">
      <nav className="flex space-x-2 overflow-x-auto pb-1" aria-label="Super Admin Navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-[#625F59] hover:text-[#141413] hover:bg-[#F4F3EE]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
