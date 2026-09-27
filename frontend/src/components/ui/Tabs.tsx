import { cn } from '../../lib/cn';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex glass p-1 gap-1 overflow-x-auto no-scrollbar', className)} role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-display font-600 uppercase tracking-wider whitespace-nowrap transition-all duration-200',
            active === t.key
              ? 'bg-neon/15 text-neon shadow-[inset_0_0_0_1px_rgba(57,255,136,0.35)]'
              : 'text-muted hover:text-cream hover:bg-white/5',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                'ml-2 px-1.5 py-0.5 rounded-md text-[10px]',
                active === t.key ? 'bg-neon/20 text-neon' : 'bg-white/5 text-muted',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
