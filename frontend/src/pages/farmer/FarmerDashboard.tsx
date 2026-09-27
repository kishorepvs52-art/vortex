import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GlassCard, Panel } from '../../components/ui/Card';
import { ButtonLink } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge, MockBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Feedback';
import { usePerfTier } from '../../hooks/usePerfTier';
import { listAnalyses, listNotifications } from '../../api/endpoints';
import { fmtRelative, fmtPercent } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

const ScanOrb = lazy(() => import('../../components/three/ScanOrb'));

export default function FarmerDashboard() {
  const user = useAuthStore((s) => s.user);
  const tier = usePerfTier();

  const { data: analyses, isLoading } = useQuery({
    queryKey: ['analyses', 'dashboard'],
    queryFn: () => listAnalyses({ page: 1, pageSize: 50 }),
  });
  const { data: notes } = useQuery({ queryKey: ['notifications-dropdown'], queryFn: () => listNotifications(1) });

  const items = analyses ?? [];
  const total = analyses?.__meta?.total ?? items.length;
  const byStatus = (s: string) => items.filter((a) => a.status === s).length;
  const healthyCount = items.filter((a) => a.aiSummary?.healthy).length;
  const unread = notes?.filter((n) => !n.read).length ?? 0;
  const recent = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const fp = user?.farmerProfile;
  const location = fp ? [fp.village, fp.district, fp.state].filter(Boolean).join(', ') : null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome hero panel */}
      <Panel className="relative overflow-hidden !p-0">
        <div className="grid md:grid-cols-[1fr_260px]">
          <div className="p-7 md:p-9">
            <p className="text-xs font-display font-600 uppercase tracking-[0.25em] text-neon">Farmer Console</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-display font-700 text-cream leading-tight">
              Welcome back, <span className="gradient-text">{user?.fullName.split(' ')[0]}</span> 🌾
            </h1>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-lg">
              {location ? `Monitoring your fields in ${location}.` : 'Your fields, monitored by AI.'}{' '}
              Upload a photo of any suspicious leaf and get an AI-assisted diagnosis with expert-backed guidance — usually in under a minute.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <ButtonLink to="/app/analyze" size="lg">🔬 Analyze a crop now</ButtonLink>
              <ButtonLink to="/app/history" variant="secondary" size="lg">🗂 View history</ButtonLink>
            </div>
            {unread > 0 && (
              <Link to="/app/notifications" className="inline-flex items-center gap-2 mt-5 text-xs text-amber hover:underline">
                🔔 {unread} unread notification{unread > 1 ? 's' : ''} — tap to view
              </Link>
            )}
          </div>
          {/* 3D identity orb */}
          <div className="relative h-48 md:h-auto min-h-[190px] border-t md:border-t-0 md:border-l border-white/10">
            {tier === 'OFF' ? (
              <div className="absolute inset-0 bg-aurora flex items-center justify-center">
                <span className="text-6xl animate-float">🌱</span>
              </div>
            ) : (
              <Suspense fallback={<div className="absolute inset-0 bg-aurora" />}>
                <ScanOrb tier={tier} compact />
              </Suspense>
            )}
            <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
              <p className="text-[10px] font-mono text-neon/70 tracking-[0.3em] uppercase">VORTEX · scanning standby</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total analyses" value={total} icon="🔬" accent="green" sub="All time" onClick={() => window.location.assign('/app/history')} />
        <StatCard label="Expert reviews" value={byStatus('EXPERT_REVIEW_PENDING')} icon="🧑‍🔬" accent="amber" sub="Awaiting expert validation" />
        <StatCard label="Completed" value={byStatus('AI_COMPLETED') + byStatus('EXPERT_REVIEWED')} icon="✅" accent="cyan" sub="Results ready" />
        <StatCard label="Healthy samples" value={healthyCount} icon="🌿" accent="green" sub="No disease detected" />
      </div>

      {/* Recent analyses */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display font-700 text-cream">Recent analyses</h2>
          <Link to="/app/history" className="text-xs text-neon hover:underline">View all →</Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3 animate-float inline-block">🍃</p>
            <p className="text-sm text-cream font-display font-600">No analyses yet</p>
            <p className="text-xs text-muted mt-1.5">Upload your first crop photo and VORTEX will take it from there.</p>
            <ButtonLink to="/app/analyze" className="mt-5">🔬 Analyze my first crop</ButtonLink>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((a) => (
              <Link key={a.id} to={`/app/analyses/${a.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-neon/[0.04] transition-colors group">
                <img src={a.thumbUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 group-hover:border-neon/40 transition-colors" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-display font-600 text-cream truncate">
                    {a.cropType.emoji} {a.cropType.name}
                    {a.aiSummary && <span className="text-muted font-400"> · {a.aiSummary.healthy ? 'Healthy' : a.aiSummary.predictedLabel}</span>}
                  </p>
                  <p className="text-[11px] text-muted/70 font-mono mt-0.5">
                    {fmtRelative(a.createdAt)}
                    {a.aiSummary && !a.aiSummary.healthy && ` · confidence ${fmtPercent(a.aiSummary.confidence, 0)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.aiSummary?.isMock && <MockBadge className="hidden lg:inline-flex" label="SIM AI" />}
                  <StatusBadge status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
