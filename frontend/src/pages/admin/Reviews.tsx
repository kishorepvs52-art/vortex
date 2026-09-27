// Admin — expert review monitor (all reviewers, all states).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminReviews } from '../../api/endpoints';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge, Badge, MockBadge } from '../../components/ui/Badge';
import { fmtDateTime, fmtPercent } from '../../lib/format';
import type { ReviewListItem } from '../../types/api';

export default function AdminReviews() {
  const [tab, setTab] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', tab, page],
    queryFn: () => adminReviews({ status: tab, page }),
  });

  const columns: Column<ReviewListItem>[] = [
    {
      key: 'case',
      header: 'Case',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={r.analysis.thumbUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" loading="lazy" />
          <div>
            <p className="text-sm font-display font-600 text-cream whitespace-nowrap">
              {r.analysis.cropType.emoji} {r.analysis.cropType.name} · {r.analysis.farmerName}
            </p>
            <p className="text-[11px] text-muted/70 font-mono">{fmtDateTime(r.createdAt)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ai',
      header: 'AI said',
      render: (r) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-cream/90">{r.analysis.ai?.predictedLabel ?? '—'}</span>
          <span className="font-mono text-xs text-muted">{fmtPercent(r.analysis.ai?.confidence ?? 0, 0)}</span>
          {r.analysis.ai?.isMock && <MockBadge label="SIM" className="!px-1.5 !py-0.5 !text-[9px]" />}
        </div>
      ),
    },
    {
      key: 'expert',
      header: 'Expert',
      hideBelow: 'md',
      render: (r) =>
        r.expert ? (
          <span className="text-sm text-cream/85">{r.expert.fullName}</span>
        ) : (
          <span className="text-xs text-muted">unclaimed</span>
        ),
    },
    {
      key: 'decision',
      header: 'Decision',
      hideBelow: 'lg',
      render: (r) =>
        r.decision ? (
          <Badge color={r.decision === 'APPROVE_AI' ? 'green' : 'violet'}>
            {r.decision === 'APPROVE_AI' ? '✓ approved' : '✎ corrected'}{r.finalDisease ? ` → ${r.finalDisease.name}` : ''}
          </Badge>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const meta = data?.__meta;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">📋 Expert reviews monitor</h1>
        <p className="text-sm text-muted mt-1">Full visibility over the human-validation layer.</p>
      </div>

      <Tabs
        items={[
          { key: 'ALL', label: 'All' },
          { key: 'PENDING', label: 'Pending pool' },
          { key: 'CLAIMED', label: 'In review' },
          { key: 'COMPLETED', label: 'Completed' },
        ]}
        active={tab}
        onChange={(t) => { setTab(t); setPage(1); }}
      />

      <DataTable columns={columns} rows={data} loading={isLoading} emptyMessage="No reviews in this state." />
      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
    </div>
  );
}
