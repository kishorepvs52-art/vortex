import { useToastStore, type ToastKind } from '../../store/toastStore';
import { cn } from '../../lib/cn';

const KIND_STYLES: Record<ToastKind, { border: string; icon: string; glow: string }> = {
  success: { border: 'border-neon/40', icon: '✓', glow: 'shadow-[0_0_24px_rgba(57,255,136,0.2)]' },
  error: { border: 'border-danger/40', icon: '✕', glow: 'shadow-[0_0_24px_rgba(255,92,92,0.2)]' },
  info: { border: 'border-cyan/40', icon: 'ℹ', glow: 'shadow-[0_0_24px_rgba(34,211,238,0.2)]' },
  warning: { border: 'border-amber/40', icon: '⚠', glow: 'shadow-[0_0_24px_rgba(255,176,32,0.2)]' },
};

const KIND_TEXT: Record<ToastKind, string> = {
  success: 'text-neon',
  error: 'text-danger',
  info: 'text-cyan',
  warning: 'text-amber',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]" role="status" aria-live="polite">
      {toasts.map((t) => {
        const s = KIND_STYLES[t.kind];
        return (
          <div
            key={t.id}
            className={cn('glass-strong border p-4 flex items-start gap-3 animate-fade-up', s.border, s.glow)}
          >
            <span className={cn('w-6 h-6 shrink-0 rounded-full border border-current flex items-center justify-center text-xs font-bold', KIND_TEXT[t.kind])}>
              {s.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-display font-600 text-cream truncate">{t.title}</p>
              {t.message && <p className="text-xs text-muted mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-cream text-sm shrink-0 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
