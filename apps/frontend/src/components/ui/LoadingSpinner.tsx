import { classNames } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className, label }: Props) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return (
    <div className={classNames('flex items-center justify-center gap-3', className)}>
      <span
        className={classNames(
          sizeClass,
          'rounded-full border-[3px] border-brand-500/20 border-t-brand-500 animate-spin',
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <span className="text-sm text-accent-charcoal/60">{label}</span>}
    </div>
  );
}
