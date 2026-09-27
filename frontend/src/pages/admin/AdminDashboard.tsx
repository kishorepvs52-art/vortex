// Admin dashboard — live platform statistics, charts and activity feed.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminActivity, adminStats } from '../../api/endpoints';
import { GlassCard, Panel } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Feedback';
import { fmtRelative } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

const DONUT_COLORS = ['#39ff88', '#22d3ee', '#a855f7', '#ffb020', '#ff5c5c', '#3b82f6', '#00e676', '#f472b6'];

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: '👤 New user registered',
  USER_LOGIN: '🔑 User signed in',
  ANALYSIS_CREATED: '🔬 Analysis submitted',
  ANALYSIS_COMPLETED: '✅ Analysis completed',
  ANALYSIS_FAILED: '⚠️ Analysis failed',
  REVIEW_REQUESTED: '🧑‍🔬 Expert review requested',
  REVIEW_CLAIMED: '🔒 Case claimed',
  REVIEW_COMPLETED: '🎓 Review completed',
  EXPERT_APPROVED: '✔️ Expert approved',
  EXPERT_DEACTIVATED: '⛔ Expert deactivated',
  EXPERT_PENDING_REGISTRATION: '⏳ Expert awaiting approval',
  ADMIN_USER_UPDATED: '🛡️ Admin updated user',
  CROP_CREATED: '🌾 Crop added',
  CROP_UPDATED: '🌾 Crop updated',
  CROP_DELETED: '🗑 Crop deleted',
  CROP_DEACTIVATED: '💤 Crop deactivated',
  DISEASE_CREATED: '🦠 Disease added',
  DISEASE_UPDATED: '🦠 Disease updated',
  DISEASE_DELETED: '🗑 Disease deleted',
  DISEASE_DEACTIVATED: '💤 Disease deactivated',
  SETTING_UPDATED: '⚙️ Setting changed',
  PROFILE_UPDATED: '👤 Profile updated',
  PASSWORD_CHANGED: '🔑 Password changed',
  CONTACT_MESSAGE: '✉️ Contact message',
};

function DiseaseDonut({ data }: { data: { id: string; name: string; cropName: string; emoji: string | null; count: number }[] }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  if (total === 0) return <p className="text-sm text-muted text-center py-10">No disease predictions recorded yet.</p>;

  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width="170" height="170" viewBox="0 0 170 170" className="shrink-0 -rotate-90">
        <circle cx="85" cy="85" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
        {data.map((d, i) => {
          const frac = d.count / total;
          const dash = frac * C;
          const el = (
            <circle
              key={d.id}
              cx="85" cy="85" r={R} fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 4px ${DONUT_COLORS[i % DONUT_COLORS.length]}60)` }}
            >
              <title>{d.name}: {d.count}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {data.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-cream/85 truncate">{d.emoji} {d.name}</span>
            <span className="text-muted/60 font-mono ml-auto">{d.count} · {((d.count / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysesBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.count} analyses`}>
            <span className="text-[9px] font-mono text-neon opacity-0 group-hover:opacity-100 transition-opacity">{d.count || ''}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-neon-dark to-neon-dim transition-all duration-700 group-hover:to-neon group-hover:shadow-neon"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[9px] font-mono text-muted/50">
        <span>{data[0]?.date.slice(5)}</span>
        <span>last 14 days</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminStats, refetchInterval: 30_000 });
  const { data: activity } = useQuery({ queryKey: ['admin-activity'], queryFn: () => adminActivity(14), refetchInterval: 30_000 });

  return (
    <div className="space-y-6 animate-fade-up">
      <Panel className="relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-amber/10 blur-3xl" aria-hidden />
        <p className="text-xs font-display font-600 uppercase tracking-[0.25em] text-amber">Admin Console</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-display font-700 text-cream">
          Platform control, <span className="gradient-text">{user?.fullName.split(' ')[0]}</span> 🛡️
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xl">
          Live view of every user, analysis and expert review flowing through VORTEX — straight from PostgreSQL.
        </p>
        {stats && stats.users.pendingExperts > 0 && (
          <Link to="/admin/experts" className="inline-flex items-center gap-2 mt-5 glass px-4 py-2.5 rounded-xl text-sm text-amber border-amber/40 hover:bg-amber/10 transition-colors animate-pulse-glow">
            ⏳ {stats.users.pendingExperts} expert registration{stats.users.pendingExperts > 1 ? 's' : ''} awaiting approval →
          </Link>
        )}
      </Panel>

      {isLoading || !stats ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* User stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total users" value={stats.users.total} icon="👥" accent="green" />
            <StatCard label="Farmers" value={stats.users.farmers} icon="👨‍🌾" accent="green" sub="Active accounts" />
            <StatCard label="Experts" value={stats.users.experts} icon="🧑‍🔬" accent="violet" sub={`${stats.users.pendingExperts} pending approval`} onClick={() => window.location.assign('/admin/experts')} />
            <StatCard label="Analyses" value={stats.analyses.total} icon="🔬" accent="cyan" sub={`${stats.analyses.failed} failed`} onClick={() => window.location.assign('/admin/analyses')} />
            <StatCard label="Pending reviews" value={stats.reviews.pending + stats.reviews.claimed} icon="📋" accent="amber" sub={`${stats.reviews.completed} completed`} onClick={() => window.location.assign('/admin/reviews')} />
          </div>

          {/* Analysis status breakdown */}
          <GlassCard>
            <h2 className="font-display font-700 text-cream mb-4">Analysis pipeline breakdown</h2>
            <div className="flex flex-wrap gap-2.5">
              <Badge color="cyan">⚙ {stats.analyses.processing} processing</Badge>
              <Badge color="green">✓ {stats.analyses.aiCompleted} AI completed</Badge>
              <Badge color="amber">🔬 {stats.analyses.reviewPending} awaiting expert</Badge>
              <Badge color="violet">🎓 {stats.analyses.reviewDone} expert reviewed</Badge>
              <Badge color="red">⚠ {stats.analyses.failed} failed</Badge>
            </div>
            <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-white/5 border border-white/10">
              {([
                [stats.analyses.aiCompleted, '#39ff88'],
                [stats.analyses.reviewDone, '#a855f7'],
                [stats.analyses.reviewPending, '#ffb020'],
                [stats.analyses.processing, '#22d3ee'],
                [stats.analyses.failed, '#ff5c5c'],
              ] as [number, string][]).map(([n, c], i) =>
                n > 0 ? (
                  <div key={i} style={{ width: `${(n / Math.max(1, stats.analyses.total)) * 100}%`, background: c }} title={`${n}`} />
                ) : null,
              )}
            </div>
          </GlassCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h2 className="font-display font-700 text-cream mb-5">📈 Analyses — last 14 days</h2>
              <AnalysesBarChart data={stats.analysesPerDay} />
            </GlassCard>
            <GlassCard>
              <h2 className="font-display font-700 text-cream mb-5">🦠 Top predicted diseases</h2>
              <DiseaseDonut data={stats.diseaseStats} />
            </GlassCard>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* AI provider health */}
            <GlassCard className="lg:col-span-2">
              <h2 className="font-display font-700 text-cream mb-4">🤖 AI provider split</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between glass px-4 py-3 rounded-xl">
                  <span className="text-sm text-amber flex items-center gap-2">◈ Simulated (mock)</span>
                  <span className="font-mono text-amber font-700">{stats.aiProviders.mock}</span>
                </div>
                <div className="flex items-center justify-between glass px-4 py-3 rounded-xl">
                  <span className="text-sm text-neon flex items-center gap-2">● Real provider</span>
                  <span className="font-mono text-neon font-700">{stats.aiProviders.real}</span>
                </div>
                <p className="text-[11px] text-muted/70 leading-relaxed">
                  {stats.aiProviders.real === 0
                    ? 'No real AI key configured — the platform runs on the clearly-labelled mock provider. Add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env to switch with zero code changes.'
                    : 'Real provider results are mixed with historical mock results.'}
                </p>
              </div>
            </GlassCard>

            {/* Activity feed */}
            <GlassCard className="lg:col-span-3 !p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-display font-700 text-cream">🕑 Recent activity</h2>
                <span className="w-2 h-2 rounded-full bg-neon animate-pulse" title="live" />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {activity?.map((a) => (
                  <div key={a.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="text-cream/90">{ACTION_LABELS[a.action] ?? a.action}</span>
                      {a.actor && <span className="text-muted/70 text-xs"> · {a.actor.fullName} ({a.actor.role.toLowerCase()})</span>}
                    </span>
                    <span className="text-[10px] text-muted/50 font-mono shrink-0">{fmtRelative(a.createdAt)}</span>
                  </div>
                ))}
                {!activity?.length && <p className="p-8 text-center text-sm text-muted">No activity recorded yet.</p>}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
