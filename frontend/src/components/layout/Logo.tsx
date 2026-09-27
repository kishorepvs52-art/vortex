import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="vx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#39ff88" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="#04120a" stroke="url(#vx-g)" strokeWidth="2.5" />
      <path d="M15 20 L32 46 L49 20" stroke="url(#vx-g)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="21" r="3.4" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function Logo({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group" aria-label="VORTEX home">
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:drop-shadow-[0_0_10px_rgba(57,255,136,0.6)]" />
      {!compact && (
        <span className="font-display font-700 text-xl tracking-[0.14em] text-cream">
          VOR<span className="gradient-text">TEX</span>
        </span>
      )}
    </Link>
  );
}
