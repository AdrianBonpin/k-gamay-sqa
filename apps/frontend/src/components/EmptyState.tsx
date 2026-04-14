import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 animate-fadein">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-hero text-white shadow-glow">
        {icon}
      </div>
      <h3 className="font-display text-2xl md:text-3xl text-accent-charcoal mb-2">{title}</h3>
      <p className="text-accent-charcoal/60 max-w-sm mb-6 text-pretty">{description}</p>
      {action}
    </div>
  );
}
