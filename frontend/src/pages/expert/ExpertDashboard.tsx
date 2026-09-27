import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getExpertStats, listReviews } from '../../api/endpoints';
import { Panel, GlassCard } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { ButtonLink } from '../../components/ui/Button';
import { StatusBadge, MockBadge, Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Feedback';
import { fmtRelative, fmtPercent } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

export default function ExpertDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading } = useQuery({ queryKey: ['expert-stats'], queryFn: getExpertStats, refetchInterval: 30_000 });
  const { data: pending } = useQuery({
    queryKey: ['reviews', 'PENDING', 'dash'],
    queryFn: () => listReviews({ status: 'PENDING', pageSize: 4 }),
    refetchInterval: 30_000,
  });

  const ep = user?.expertProfile;

  return (
    <div className="space-y-6 animate-fade-up">
      <Panel className="relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-violet/10 blur-3xl" aria-hidden />
        <p className="text-xs font-display font-600 uppercase tracking-[0.25em] text-violet">Expert Console</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-display font-700 text-cream leading-tight">
          Dr. desk of <span className="gradient-text">{user?.fullName}</span> 🧑‍🔬
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xl leading-relaxed">
          {ep?.specialization ? `${ep.specialization} · ` : ''}
          {ep?.qualification ? `${ep.qualification} · ` : ''}
          You are the human judgment layer of VORTEX — validating every uncertain AI diagnosis before it reaches a farmer.
        </p>
        <div className="mt-6 flex gap-3 flex-wrap">
          <ButtonLink to="/expert/cases" size="lg">📋 Open case queue</ButtonLink>
          {stats && stats.pending > 0 && (
            <span className="inline-flex items-center gap-2 glass px-4 py-2 rounded-xl text-sm text-amber border-amber/30 animate-pulse-glow">
              ⚡ {stats.pending} case{stats.pending > 1 ? 's' : ''} waiting
            </span>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending in queue" value={stats?.pending ?? '—'} icon="📋" accent="amber" sub="Unclaimed cases" />
        <StatCard label="Claimed by you" value={stats?.claimedMine ?? '—'} icon="🔍" accent="cyan" sub="In progress" />
        <StatCard label="Completed by you" value={stats?.completedMine ?? '—'} icon="✅" accent="green" sub="Your validations" />
        <StatCard label="Platform total" value={stats?.completedTotal ?? '—'} icon="🌐" accent="violet" sub="All expert reviews" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-display font-700 text-cream">Awaiting claim</h2>
            <Link to="/expert/cases" className="text-xs text-neon hover:underline">Full queue →</Link>
          </div>
          {!pending ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : pending.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">🎉 Queue is clear — no cases need validation right now.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {pending.map((r) => (
                <Link key={r.id} to={`/expert/cases/${r.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-violet/[0.05] transition-colors group">
                  <img src={r.analysis.thumbUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:border-violet/50 transition-colors" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-display font-600 text-cream truncate">
                      {r.analysis.cropType.emoji} {r.analysis.cropType.name} · <span className="text-muted">{r.analysis.ai?.predictedLabel ?? 'unmatched label'}</span>
                    </p>
                    <p className="text-[11px] text-muted/70 font-mono mt-0.5">
                      confidence {fmtPercent(r.analysis.ai?.confidence ?? 0, 0)} · {fmtRelative(r.createdAt)}
                      {r.requestedByFarmer && ' · farmer-requested'}
                    </p>
                  </div>
                  {r.analysis.ai?.isMock && <MockBadge label="SIM" className="!px-1.5 !py-0.5 !text-[9px]" />}
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-display font-700 text-cream">Your recent validations</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !stats?.recent.length ? (
            <p className="p-8 text-center text-sm text-muted">Completed reviews will appear here.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {stats.recent.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="text-xl">{r.emoji ?? '🌿'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-cream truncate">{r.cropName}</p>
                    <p className="text-[11px] text-muted/70 font-mono">{r.completedAt ? fmtRelative(r.completedAt) : ''}</p>
                  </div>
                  <Badge color={r.decision === 'APPROVE_AI' ? 'green' : 'violet'}>
                    {r.decision === 'APPROVE_AI' ? '✓ approved AI' : '✎ corrected'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: '🖼', title: 'Inspect the evidence', text: 'Every case shows the original image, farmer symptoms, location and the AI\'s indicators + reasoning side by side.' },
          { icon: '⚖️', title: 'Approve or correct', text: 'Confirm the AI call, or select the correct disease from the crop catalogue and set the final severity.' },
          { icon: '📝', title: 'Author the plan', text: 'Your treatment steps, preventive advice and comments become the farmer\'s final, expert-validated guidance.' },
        ].map((c) => (
          <GlassCard key={c.title} hover>
            <span className="text-2xl">{c.icon}</span>
            <h3 className="mt-2.5 font-display font-700 text-cream text-sm">{c.title}</h3>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">{c.text}</p>
          </GlassCard>
        ))}
      </div>
      <div className="hidden">
        <StatusBadge status="PENDING" />
      </div>
    </div>
  );
}
