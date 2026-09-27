// Expert case queue — PENDING pool, own CLAIMED cases, COMPLETED history.
// Claiming is race-safe on the server (atomic update).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { claimReview, listReviews } from '../../api/endpoints';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge, MockBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { toast } from '../../store/toastStore';
import { ApiClientError } from '../../api/client';
import { fmtDateTime, fmtPercent } from '../../lib/format';
import type { ReviewListItem } from '../../types/api';

export default function ExpertCases() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [claiming, setClaiming] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', tab, page],
    queryFn: () =>
      listReviews({
        status: tab === 'MINE' ? 'CLAIMED' : tab,
        mine: tab === 'MINE' || tab === 'DONE_MINE',
        page,
        pageSize: 10,
      }),
    refetchInterval: tab === 'PENDING' ? 20_000 : false,
  });

  const counts = useQuery({
    queryKey: ['reviews-counts'],
    queryFn: async () => {
      const [p, c, d] = await Promise.all([
        listReviews({ status: 'PENDING', pageSize: 1 }),
        listReviews({ status: 'CLAIMED', mine: true, pageSize: 1 }),
        listReviews({ status: 'COMPLETED', mine: true, pageSize: 1 }),
      ]);
      return { pending: p.__meta?.total ?? 0, mine: c.__meta?.total ?? 0, done: d.__meta?.total ?? 0 };
    },
    refetchInterval: 20_000,
  });

  const onClaim = async (e: React.MouseEvent, r: ReviewListItem) => {
    e.stopPropagation();
    setClaiming(r.id);
    try {
      await claimReview(r.id);
      toast.success('Case claimed', 'It is now locked to you — open it to submit your review.');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['reviews-counts'] });
      qc.invalidateQueries({ queryKey: ['expert-stats'] });
      navigate(`/expert/cases/${r.id}`);
    } catch (err) {
      toast.error('Claim failed', err instanceof ApiClientError ? err.message : 'Another expert may have claimed it first.');
      qc.invalidateQueries({ queryKey: ['reviews'] });
    } finally {
      setClaiming(null);
    }
  };

  const effectiveTab = tab === 'DONE_MINE' ? 'COMPLETED' : tab === 'MINE' ? 'CLAIMED' : tab;

  const columns: Column<ReviewListItem>[] = [
    {
      key: 'case',
      header: 'Case',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={r.analysis.thumbUrl} alt="" className="w-11 h-11 rounded-lg object-cover border border-white/10" loading="lazy" />
          <div className="min-w-0">
            <p className="font-display font-600 text-cream text-sm whitespace-nowrap">
              {r.analysis.cropType.emoji} {r.analysis.cropType.name}
              {r.requestedByFarmer && <span className="text-cyan"> · farmer-requested</span>}
            </p>
            <p className="text-[11px] text-muted/70 truncate max-w-[240px]">{r.analysis.symptoms ?? 'no symptoms reported'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ai',
      header: 'AI prediction',
      render: (r) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-cream/90">{r.analysis.ai?.predictedLabel ?? '—'}</span>
          <span className={`font-mono text-xs ${(r.analysis.ai?.confidence ?? 0) >= 0.6 ? 'text-amber' : 'text-danger'}`}>
            {fmtPercent(r.analysis.ai?.confidence ?? 0, 0)}
          </span>
          {r.analysis.ai?.isMock && <MockBadge label="SIM" className="!px-1.5 !py-0.5 !text-[9px]" />}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'md',
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={r.status} />
          {r.isMine && <Badge color="cyan">yours</Badge>}
          {r.status === 'COMPLETED' && r.expert && !r.isMine && (
            <span className="text-[10px] text-muted/60">by {r.expert.fullName}</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Waiting since',
      hideBelow: 'lg',
      render: (r) => <span className="text-xs text-muted font-mono">{fmtDateTime(r.createdAt)}</span>,
    },
    {
      key: 'action',
      header: '',
      render: (r) =>
        r.status === 'PENDING' ? (
          <Button size="sm" loading={claiming === r.id} onClick={(e) => void onClaim(e, r)}>
            Claim →
          </Button>
        ) : r.isMine && r.status === 'CLAIMED' ? (
          <Button size="sm" variant="cyan" onClick={(e) => { e.stopPropagation(); navigate(`/expert/cases/${r.id}`); }}>
            Continue →
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/expert/cases/${r.id}`); }}>
            View →
          </Button>
        ),
    },
  ];

  const meta = data?.__meta;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">📋 Case queue</h1>
        <p className="text-sm text-muted mt-1">
          Low-confidence and farmer-flagged cases. Claim to lock a case, then validate or correct the AI.
        </p>
      </div>

      <Tabs
        items={[
          { key: 'PENDING', label: '🔔 Pending pool', count: counts.data?.pending },
          { key: 'MINE', label: '🔍 My active', count: counts.data?.mine },
          { key: 'DONE_MINE', label: '✅ My completed', count: counts.data?.done },
          { key: 'ALL', label: '🌐 All' },
        ]}
        active={tab}
        onChange={(t) => { setTab(t); setPage(1); }}
      />

      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        emptyMessage={
          effectiveTab === 'PENDING'
            ? '🎉 No cases waiting — the AI is confident or the queue is clear.'
            : 'Nothing here yet.'
        }
        onRowClick={(r) => navigate(`/expert/cases/${r.id}`)}
      />

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
    </div>
  );
}
