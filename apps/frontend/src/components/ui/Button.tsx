import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      loading,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const variantClass =
      variant === 'primary'
        ? 'btn-primary'
        : variant === 'secondary'
          ? 'btn-secondary'
          : 'btn-ghost';
    const sizeClass = size === 'sm' ? 'btn-size-sm' : size === 'lg' ? 'btn-size-lg' : 'btn-size-md';

    return (
      <button
        ref={ref}
        className={classNames(variantClass, sizeClass, className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
