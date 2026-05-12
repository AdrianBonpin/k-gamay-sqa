interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = 'text-brand-500' }: StatCardProps) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-accent-charcoal/40 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
