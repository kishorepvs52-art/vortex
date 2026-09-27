import { cn } from '../../lib/cn';
import { STATUS_LABELS, titleCase } from '../../lib/format';
import type { AnalysisStatus, ReviewStatus, Severity } from '../../types/api';

export function Badge({
  children,
  color = 'green',
  className,
}: {
  children: React.ReactNode;
  color?: 'green' | 'cyan' | 'amber' | 'red' | 'violet' | 'grey';
  className?: string;
}) {
  const colors = {
    green: 'bg-neon/10 text-neon border-neon/30',
    cyan: 'bg-cyan/10 text-cyan border-cyan/30',
    amber: 'bg-amber/10 text-amber border-amber/30',
    red: 'bg-danger/10 text-danger border-danger/30',
    violet: 'bg-violet/10 text-violet border-violet/30',
    grey: 'bg-white/5 text-muted border-white/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-display font-600 uppercase tracking-wider whitespace-nowrap',
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_COLORS: Record<string, 'green' | 'cyan' | 'amber' | 'red' | 'violet' | 'grey'> = {
  PROCESSING: 'cyan',
  AI_COMPLETED: 'green',
  EXPERT_REVIEW_PENDING: 'amber',
  EXPERT_REVIEWED: 'violet',
  FAILED: 'red',
  PENDING: 'amber',
  CLAIMED: 'cyan',
  COMPLETED: 'green',
};

export function StatusBadge({ status, className }: { status: AnalysisStatus | ReviewStatus | string; className?: string }) {
  return (
    <Badge color={STATUS_COLORS[status] ?? 'grey'} className={className}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'PROCESSING' || status === 'CLAIMED' ? 'bg-current animate-pulse' : 'bg-current')} />
      {STATUS_LABELS[status] ?? titleCase(status)}
    </Badge>
  );
}

const SEVERITY_COLORS: Record<Severity, 'green' | 'cyan' | 'amber' | 'red' | 'grey'> = {
  NONE: 'green',
  LOW: 'cyan',
  MODERATE: 'amber',
  HIGH: 'red',
  CRITICAL: 'red',
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge color={SEVERITY_COLORS[severity]} className={className}>
      {severity === 'CRITICAL' && <span className="animate-pulse">⚠</span>}
      {titleCase(severity)}
    </Badge>
  );
}

/** Honest labelling of simulated AI results — shown everywhere mock data appears. */
export function MockBadge({ className, label }: { className?: string; label?: string }) {
  return (
    <Badge color="amber" className={cn('border-dashed', className)}>
      <span aria-hidden>◈</span>
      {label ?? 'Simulated AI · Dev Fallback'}
    </Badge>
  );
}

export function PathogenBadge({ type, className }: { type: string; className?: string }) {
  const map: Record<string, 'green' | 'cyan' | 'amber' | 'red' | 'violet' | 'grey'> = {
    FUNGAL: 'amber',
    BACTERIAL: 'cyan',
    VIRAL: 'violet',
    NUTRITIONAL: 'green',
    PEST: 'red',
    PHYSIOLOGICAL: 'grey',
    HEALTHY: 'green',
    UNKNOWN: 'grey',
  };
  return <Badge color={map[type] ?? 'grey'} className={className}>{titleCase(type)}</Badge>;
}
