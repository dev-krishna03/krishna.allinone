import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#F4F3EE] text-[#141413] border-[#E8E6DC]',
    success: 'bg-[#476B3C]/10 text-[#476B3C] border-[#476B3C]/20',
    warning: 'bg-[#996000]/10 text-[#996000] border-[#996000]/20',
    danger: 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20',
    info: 'bg-[#2F5C83]/10 text-[#2F5C83] border-[#2F5C83]/20',
    outline: 'bg-transparent text-[#141413] border-[#E8E6DC]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
