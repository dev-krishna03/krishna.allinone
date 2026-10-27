import * as React from 'react';
import { cn } from './utils';

export interface NavbarProps {
  breadcrumbs?: { label: string; href?: string }[];
  onOpenCommandPalette?: () => void;
  className?: string;
}

export function Navbar({
  breadcrumbs = [],
  onOpenCommandPalette,
  className,
}: NavbarProps) {
  return (
    <header
      className={cn(
        'flex h-14 w-full items-center justify-between border-b border-[#E8E6DC] bg-[#FFFFFF] px-6 text-[#141413]',
        className
      )}
    >
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-[#8A867D]">/</span>}
            {crumb.href ? (
              <a
                href={crumb.href}
                className="font-medium text-[#625F59] hover:text-[#C15F3C] transition-colors"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="font-semibold text-[#141413]">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Quick Actions & Command Palette Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-md border border-[#E8E6DC] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#625F59] hover:border-[#D5D2C5] hover:text-[#141413] transition-colors"
        >
          <span>Search or jump to...</span>
          <kbd className="rounded bg-[#E8E6DC] px-1.5 py-0.5 text-[10px] text-[#141413]">⌘K</kbd>
        </button>

        {/* Notifications Icon */}
        <button
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-[#625F59] hover:bg-[#F4F3EE] hover:text-[#141413] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#C15F3C]" />
        </button>

        {/* Help */}
        <a
          href="/contact"
          className="rounded-md p-1.5 text-[#625F59] hover:bg-[#F4F3EE] hover:text-[#141413] transition-colors text-xs font-medium"
        >
          Help
        </a>
      </div>
    </header>
  );
}
