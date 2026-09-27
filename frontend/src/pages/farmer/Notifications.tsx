// Notifications inbox — real rows, mark read / read all.
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAllRead, markRead } from '../../api/endpoints';
import { GlassCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { fmtDateTime } from '../../lib/format';
import { toast } from '../../store/toastStore';
import { cn } from '../../lib/cn';

const TYPE_META: Record<string, { icon: string; color: 'green' | 'cyan' | 'amber' | 'violet' | 'red' | 'grey'; label: string }> = {
  ANALYSIS_COMPLETE: { icon: '✅', color: 'green', label: 'Analysis complete' },
  ANALYSIS_FAILED: { icon: '⚠️', color: 'red', label: 'Analysis failed' },
  EXPERT_REVIEW_NEEDED: { icon: '🔬', color: 'amber', label: 'Expert review' },
  EXPERT_REVIEW_ASSIGNED: { icon: '📋', color: 'cyan', label: 'Case assigned' },
  EXPERT_REVIEW_COMPLETED: { icon: '🎓', color: 'violet', label: 'Review completed' },
  SYSTEM: { icon: '◈', color: 'grey', label: 'System' },
};

export default function FarmerNotifications() {
  const qc = useQueryClient();
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: () => listNotifications(1),
  });

  const onReadAll = async () => {
    await markAllRead();
    toast.success('All notifications marked as read');
    qc.invalidateQueries({ queryKey: ['notifications-page'] });
    qc.invalidateQueries({ queryKey: ['notifications-dropdown'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const onRead = async (id: string) => {
    await markRead(id).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ['notifications-page'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🔔 Notifications</h1>
          <p className="text-sm text-muted mt-1">Every milestone of every analysis, in one place.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void onReadAll()}>Mark all as read</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState icon="🔕" title="No notifications yet" message="Submit an analysis and you'll see live updates here — AI results, expert reviews and platform messages." />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            return (
              <GlassCard
                key={n.id}
                hover
                className={cn('!p-5 flex gap-4 items-start', !n.read && 'border-neon/30 bg-neon/[0.04]')}
              >
                <span className="text-2xl shrink-0 mt-0.5">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={meta.color}>{meta.label}</Badge>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-neon animate-pulse" aria-label="unread" />}
                    <span className="text-[11px] text-muted/60 font-mono ml-auto">{fmtDateTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-display font-600 text-cream">{n.title}</p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{n.message}</p>
                  <div className="mt-3 flex gap-3">
                    {n.analysisId && (
                      <Link to={`/app/analyses/${n.analysisId}`} onClick={() => void onRead(n.id)} className="text-xs text-neon font-600 hover:underline">
                        Open analysis →
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => void onRead(n.id)} className="text-xs text-muted hover:text-cream transition-colors">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
