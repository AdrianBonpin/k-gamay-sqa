import { CheckCircle2, ChefHat, Package } from 'lucide-react';
import type { OrderStatus } from '@/types';
import { classNames, statusLabel } from '@/lib/utils';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const config =
    status === 'delivered'
      ? { className: 'bg-accent-forest/10 text-accent-forest', Icon: CheckCircle2 }
      : status === 'in_progress'
        ? { className: 'bg-accent-mustard/15 text-accent-mustard', Icon: ChefHat }
        : { className: 'bg-brand-50 text-brand-700', Icon: Package };
  const { Icon } = config;
  return (
    <span
      className={classNames(
        'badge',
        config.className,
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
      )}
    >
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3 w-3'} strokeWidth={2.5} />
      {statusLabel(status)}
    </span>
  );
}
