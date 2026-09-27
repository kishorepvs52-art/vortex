import { cn } from '../../lib/cn';
import { SEVERITY_ORDER } from '../../lib/format';
import type { Severity } from '../../types/api';

/** Animated SVG confidence ring (0..1). */
export function ConfidenceRing({
  value,
  size = 148,
  label = 'AI Confidence',
  tone,
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: 'green' | 'amber' | 'red';
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  const autoTone: 'green' | 'amber' | 'red' = pct >= 0.75 ? 'green' : pct >= 0.6 ? 'amber' : 'red';
  const t = tone ?? autoTone;
  const colors = { green: '#39ff88', amber: '#ffb020', red: '#ff5c5c' };
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={colors[t]} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 8px ${colors[t]}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-700" style={{ color: colors[t] }}>
          {(pct * 100).toFixed(1)}%
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted mt-0.5">{label}</span>
      </div>
    </div>
  );
}

/** 5-step severity meter. */
export function SeverityMeter({ severity, className }: { severity: Severity; className?: string }) {
  const idx = SEVERITY_ORDER.indexOf(severity);
  const colors = ['#39ff88', '#22d3ee', '#ffb020', '#ff8c42', '#ff5c5c'];
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted font-display font-600">Severity</span>
        <span className="text-sm font-display font-700" style={{ color: colors[idx] }}>
          {severity}
        </span>
      </div>
      <div className="flex gap-1.5">
        {SEVERITY_ORDER.map((s, i) => (
          <div
            key={s}
            className="h-2.5 flex-1 rounded-full transition-all duration-500"
            style={{
              background: i <= idx ? colors[idx] : 'rgba(255,255,255,0.06)',
              boxShadow: i === idx ? `0 0 12px ${colors[idx]}90` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
