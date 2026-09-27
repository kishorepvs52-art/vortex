import { cn } from '../../lib/cn';

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-[3px]', lg: 'w-14 h-14 border-4' }[size];
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className={cn(s, 'rounded-full border-neon/25 border-t-neon animate-spin', className)}
    />
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Spinner size="lg" />
      <p className="text-sm text-muted font-display tracking-widest uppercase animate-pulse">{label}…</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({
  icon = '◈',
  title,
  message,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('glass p-10 md:p-14 text-center', className)}>
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl glass flex items-center justify-center text-2xl text-neon animate-float">
        {icon}
      </div>
      <h3 className="text-lg font-display font-600 text-cream">{title}</h3>
      {message && <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">{message}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('glass border-danger/30 p-10 text-center', className)}>
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-xl text-danger">
        ⚠
      </div>
      <h3 className="text-lg font-display font-600 text-cream">{title}</h3>
      {message && <p className="mt-2 text-sm text-muted max-w-md mx-auto">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 text-sm font-display font-600 text-neon border border-neon/40 rounded-xl px-4 py-2 hover:bg-neon/10 transition-colors"
        >
          ↻ Try again
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ value, className, glow = true }: { value: number; className?: string; glow?: boolean }) {
  return (
    <div className={cn('h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r from-neon-dim to-leaf transition-all duration-300', glow && 'shadow-neon')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
