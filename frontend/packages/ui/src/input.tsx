import * as React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, ...props }, ref) => {
    const generatedId = id || React.useId();
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-medium text-[#141413]">
            {label}
          </label>
        )}
        <input
          id={generatedId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-[#E8E6DC] bg-[#FFFFFF] px-3 py-2 text-sm text-[#141413] placeholder:text-[#8A867D] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-[#B42318]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = id || React.useId();
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={generatedId} className="block text-xs font-medium text-[#141413]">
            {label}
          </label>
        )}
        <textarea
          id={generatedId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-[#E8E6DC] bg-[#FFFFFF] px-3 py-2 text-sm text-[#141413] placeholder:text-[#8A867D] focus:border-[#C15F3C] focus:outline-none focus:ring-1 focus:ring-[#C15F3C] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-[#B42318]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
