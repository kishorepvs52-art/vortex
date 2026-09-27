import { cn } from '../../lib/cn';

export function GlassCard({
  className,
  children,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn(hover ? 'glass-card' : 'glass', 'p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-strong p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn('mb-12', align === 'center' ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl', className)}>
      {eyebrow && (
        <div
          className={cn(
            'inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neon font-display font-600 mb-4',
          )}
        >
          <span className="w-6 h-px bg-neon/60" />
          {eyebrow}
          <span className="w-6 h-px bg-neon/60" />
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-700 text-cream leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-muted text-base md:text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/** Decorative corner brackets — holographic frame accent */
export function HoloCorners({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden>
      <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-neon/50 rounded-tl-lg" />
      <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-neon/50 rounded-tr-lg" />
      <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-neon/50 rounded-bl-lg" />
      <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-neon/50 rounded-br-lg" />
    </div>
  );
}
