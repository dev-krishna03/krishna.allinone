import * as React from 'react';
import { cn } from './utils';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  active?: boolean;
}

export interface SidebarProps {
  currentOrgName: string;
  orgList?: { id: string; name: string }[];
  onSelectOrg?: (orgId: string) => void;
  items: NavItem[];
  user?: { name: string; email: string; role: string };
  className?: string;
}

export function Sidebar({
  currentOrgName,
  orgList = [],
  onSelectOrg,
  items,
  user,
  className,
}: SidebarProps) {
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r border-[#E8E6DC] bg-[#F4F3EE] text-[#141413]',
        className
      )}
    >
      {/* Organization Header & Switcher */}
      <div className="relative border-b border-[#E8E6DC] p-4">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-[#E8E6DC]/60 transition-colors"
        >
          <div className="truncate">
            <span className="block text-xs uppercase tracking-wider text-[#625F59]">Workspace</span>
            <span className="block truncate font-semibold text-sm text-[#141413]">{currentOrgName}</span>
          </div>
          <span className="text-xs text-[#625F59]">▼</span>
        </button>

        {orgDropdownOpen && orgList.length > 0 && (
          <div className="absolute left-4 right-4 top-16 z-50 rounded-md border border-[#E8E6DC] bg-white p-1 shadow-lg">
            <div className="px-2 py-1 text-xs font-medium text-[#625F59]">Switch Workspace</div>
            {orgList.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onSelectOrg?.(org.id);
                  setOrgDropdownOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#F4F3EE] transition-colors"
              >
                {org.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              item.active
                ? 'bg-[#C15F3C] text-white'
                : 'text-[#625F59] hover:bg-[#E8E6DC]/70 hover:text-[#141413]'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs',
                  item.active ? 'bg-white/20 text-white' : 'bg-[#E8E6DC] text-[#141413]'
                )}
              >
                {item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      {/* User Profile Footer */}
      {user && (
        <div className="border-t border-[#E8E6DC] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C15F3C] text-xs font-semibold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-medium text-[#141413]">{user.name}</p>
              <p className="truncate text-[11px] text-[#625F59]">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
