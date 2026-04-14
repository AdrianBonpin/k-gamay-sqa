import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-accent-charcoal/70"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-accent-charcoal/40">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={classNames(
              'input',
              leftIcon && 'pl-11',
              error && 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30',
              className,
            )}
            {...rest}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-brand-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
