import { classNames } from '@/lib/utils';

interface Props {
  className?: string;
}

export function Skeleton({ className }: Props) {
  return (
    <div
      className={classNames(
        'animate-pulse bg-gradient-to-r from-surface-muted via-surface-soft to-surface-muted bg-[length:200%_100%] rounded-2xl',
        className,
      )}
      aria-hidden
    />
  );
}

export function MenuCardSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
