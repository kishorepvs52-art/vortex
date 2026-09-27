import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAllRead, markRead, unreadCount } from '../../api/endpoints';
import { fmtRelative } from '../../lib/format';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';

const TYPE_ICON: Record<string, string> = {
  ANALYSIS_COMPLETE: '✅',
  ANALYSIS_FAILED: '⚠️',
  EXPERT_REVIEW_NEEDED: '🔬',
  EXPERT_REVIEW_ASSIGNED: '📋',
  EXPERT_REVIEW_COMPLETED: '🎓',
  SYSTEM: '◈',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ['unread-count'],
    queryFn: unreadCount,
    refetchInterval: 30_000,
  });
  const { data: notes } = useQuery({
    queryKey: ['notifications-dropdown'],
    queryFn: () => listNotifications(1),
    enabled: open,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const home = user?.role === 'EXPERT' ? '/expert' : user?.role === 'ADMIN' ? '/admin' : '/app';

  const openNote = async (id: string, analysisId: string | null) => {
    await markRead(id).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ['unread-count'] });
    setOpen(false);
    if (analysisId && user?.role === 'FARMER') navigate(`/app/analyses/${analysisId}`);
    else if (analysisId && user?.role === 'EXPERT') navigate('/expert/cases');
    else navigate(`${home}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative w-10 h-10 glass rounded-xl flex items-center justify-center text-lg transition-colors hover:border-neon/40',
          open && 'border-neon/50',
        )}
        aria-label={`Notifications${count?.count ? ` (${count.count} unread)` : ''}`}
      >
        🔔
        {count && count.count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(255,92,92,0.6)]">
            {count.count > 9 ? '9+' : count.count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] glass-strong overflow-hidden animate-fade-up z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-display font-700 text-cream">Notifications</p>
            <button
              className="text-[11px] text-neon hover:underline"
              onClick={async () => {
                await markAllRead().catch(() => undefined);
                qc.invalidateQueries({ queryKey: ['unread-count'] });
                qc.invalidateQueries({ queryKey: ['notifications-dropdown'] });
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!notes || notes.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">No notifications yet</p>
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void openNote(n.id, n.analysisId)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-neon/[0.05] transition-colors flex gap-3',
                    !n.read && 'bg-neon/[0.03]',
                  )}
                >
                  <span className="text-lg shrink-0">{TYPE_ICON[n.type] ?? '◈'}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-600 text-cream truncate">{n.title}</span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-neon shrink-0 animate-pulse" />}
                    </span>
                    <span className="block text-xs text-muted mt-0.5 line-clamp-2">{n.message}</span>
                    <span className="block text-[10px] text-muted/60 mt-1">{fmtRelative(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          {user?.role === 'FARMER' && (
            <button
              className="w-full px-4 py-2.5 text-xs font-display font-600 text-neon border-t border-white/10 hover:bg-neon/10 transition-colors"
              onClick={() => { setOpen(false); navigate('/app/notifications'); }}
            >
              View all notifications →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
