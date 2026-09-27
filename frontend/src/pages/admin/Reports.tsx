// Admin — CSV exports built server-side from real database queries.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminStats, downloadReport } from '../../api/endpoints';
import { GlassCard, Panel } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Feedback';
import { fmtDate } from '../../lib/format';

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

function ReportCard({ title, desc, icon, children }: { title: string; desc: string; icon: string; children: React.ReactNode }) {
  return (
    <GlassCard className="relative overflow-hidden group">
      <div className="absolute -right-10 -bottom-10 text-7xl opacity-[0.07] group-hover:opacity-[0.12] transition-opacity select-none">{icon}</div>
      <h2 className="font-display font-700 text-lg text-cream flex items-center gap-2">{icon} {title}</h2>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">{desc}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </GlassCard>
  );
}

export default function AdminReports() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminStats });
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (kind: 'analyses' | 'users' | 'diseases') => {
    setDownloading(kind);
    try {
      await downloadReport(kind, kind === 'analyses' ? { from, to } : undefined);
    } finally {
      setDownloading(null);
    }
  };

  const range = useMemo(() => `${from} → ${to}`, [from, to]);

  return (
    <div className="space-y-5 animate-fade-up">
      <Panel>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">📊 Reports & exports</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          CSV exports generated live from PostgreSQL — open in Excel, Sheets or pipe into any BI tool.
        </p>
      </Panel>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <GlassCard className="!p-4"><p className="text-2xl font-display font-700 text-neon">{stats.analyses.total}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-1">Total analyses</p></GlassCard>
            <GlassCard className="!p-4"><p className="text-2xl font-display font-700 text-cyan">{stats.users.total}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-1">Registered users</p></GlassCard>
            <GlassCard className="!p-4"><p className="text-2xl font-display font-700 text-violet">{stats.reviews.completed}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-1">Expert reviews</p></GlassCard>
            <GlassCard className="!p-4"><p className="text-2xl font-display font-700 text-amber">{stats.diseaseStats.length}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-1">Diseases detected</p></GlassCard>
          </div>
        )
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <ReportCard
          icon="🔬"
          title="Analyses export"
          desc="Every analysis in a date range: farmer, crop, status, AI prediction + confidence, provider (mock/real), severity, expert decision and timings."
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              {(id) => <Input id={id} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />}
            </Field>
            <Field label="To">
              {(id) => <Input id={id} type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />}
            </Field>
          </div>
          <Button className="w-full" loading={downloading === 'analyses'} onClick={() => void handleDownload('analyses')}>
            ⬇ Download CSV <span className="text-muted font-normal ml-1">({range})</span>
          </Button>
        </ReportCard>

        <ReportCard
          icon="👥"
          title="Users export"
          desc="All accounts with role, status, region, analysis and review counts and last login timestamps."
        >
          <Button className="w-full" loading={downloading === 'users'} onClick={() => void handleDownload('users')}>
            ⬇ Download CSV
          </Button>
        </ReportCard>

        <ReportCard
          icon="🦠"
          title="Disease summary export"
          desc="Per-disease detection counts, average AI confidence, average severity and mock-vs-real provider split — ideal for outbreak trend spotting."
        >
          <Button className="w-full" loading={downloading === 'diseases'} onClick={() => void handleDownload('diseases')}>
            ⬇ Download CSV
          </Button>
          {stats && stats.diseaseStats.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] uppercase tracking-wider text-muted/70">Preview — top detected</p>
              {stats.diseaseStats.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <span className="text-cream/85">{d.emoji} {d.name}</span>
                  <span className="font-mono text-muted">{d.count}×</span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>

        <ReportCard
          icon="🗂"
          title="What's in the data"
          desc="Report queries join across analyses, reviews, experts, crops, diseases and users — the same schema powering every dashboard on this platform."
        >
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-neon">✓</span> Generated at request time — never stale caches</li>
            <li className="flex gap-2"><span className="text-neon">✓</span> UTF-8 BOM for clean Excel opening</li>
            <li className="flex gap-2"><span className="text-neon">✓</span> Admin JWT required; streamed with signed filenames</li>
          </ul>
          <p className="text-[11px] text-muted/60 pt-2">
            Last platform snapshot: {fmtDate(new Date().toISOString())} · {stats?.analyses.total ?? 0} analyses on record.
          </p>
        </ReportCard>
      </div>
    </div>
  );
}
