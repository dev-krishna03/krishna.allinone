import * as React from 'react';
import { cn } from './utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-[#E8E6DC] bg-[#FAF9F5] p-8 text-center',
        className
      )}
    >
      {icon && <div className="mb-4 text-[#8A867D]">{icon}</div>}
      <h4 className="text-base font-semibold text-[#141413]">{title}</h4>
      <p className="mt-1 max-w-sm text-sm text-[#625F59]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-[#C15F3C] px-4 py-2 text-sm font-medium text-white hover:bg-[#A84E31] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E8E6DC] border-t-[#C15F3C]"></div>
    </div>
  );
}
