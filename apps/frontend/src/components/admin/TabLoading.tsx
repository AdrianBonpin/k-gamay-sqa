import { Loader2 } from 'lucide-react';

export function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-accent-charcoal/40">Loading...</p>
      </div>
    </div>
  );
}
