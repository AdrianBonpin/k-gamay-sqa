import type { HTMLAttributes } from 'react';
import { classNames } from '@/lib/utils';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('card', className)} {...rest} />;
}
