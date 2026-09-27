import { cn } from '../../lib/cn';

export function StatCard({
  label,
  value,
  icon,
  accent = 'green',
  sub,
  className,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'green' | 'cyan' | 'amber' | 'violet' | 'red';
  sub?: string;
  className?: string;
  onClick?: () => void;
}) {
  const accents = {
    green: 'text-neon shadow-[0_0_20px_rgba(57,255,136,0.15)] border-neon/25',
    cyan: 'text-cyan shadow-[0_0_20px_rgba(34,211,238,0.15)] border-cyan/25',
    amber: 'text-amber shadow-[0_0_20px_rgba(255,176,32,0.15)] border-amber/25',
    violet: 'text-violet shadow-[0_0_20px_rgba(168,85,247,0.15)] border-violet/25',
    red: 'text-danger shadow-[0_0_20px_rgba(255,92,92,0.15)] border-danger/25',
  };
  return (
    <div
      className={cn('glass p-5 relative overflow-hidden group', onClick && 'cursor-pointer hover:border-neon/30 transition-colors', className)}
      onClick={onClick}
    >
      <div className={cn('absolute -right-6 -top-6 w-24 h-24 rounded-full border bg-gradient-to-br from-white/[0.04] to-transparent', accents[accent])} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-display font-600 uppercase tracking-[0.16em] text-muted">{label}</p>
          {icon && <span className={cn('text-lg', accents[accent].split(' ')[0])}>{icon}</span>}
        </div>
        <p className={cn('mt-2 text-3xl font-display font-700', accents[accent].split(' ')[0])}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted/80">{sub}</p>}
      </div>
    </div>
  );
}
