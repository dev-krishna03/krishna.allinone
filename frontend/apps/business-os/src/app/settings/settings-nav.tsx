'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SettingsNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Members', href: '/settings/members' },
    { label: 'Roles & Scopes', href: '/settings/roles' },
    { label: 'Teams & Departments', href: '/settings/teams' },
    { label: 'Permission Matrix', href: '/settings/permissions' },
    { label: 'Policies & Simulator', href: '/settings/access-policies' },
    { label: 'Billing & Invoices', href: '/settings/billing' },
    { label: 'Integrations & Connectors', href: '/settings/integrations' },
    { label: 'Workspace & Docs', href: '/settings/workspace' },
    { label: 'Subscription', href: '/settings/subscription' },
    { label: 'Seat Licenses', href: '/settings/licenses' },
    { label: 'Security Audit', href: '/settings/security-audit' },
    { label: 'Auth & Sessions', href: '/settings/security' },
  ];

  return (
    <div className="border-b border-[#E8E6DC] mb-8">
      <nav className="flex space-x-2 overflow-x-auto pb-1" aria-label="Settings Navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#C15F3C] text-white shadow-sm'
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
