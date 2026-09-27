// Expert — completed reviews by me.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listReviews } from '../../api/endpoints';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { fmtDateTime } from '../../lib/format';
import type { ReviewListItem } from '../../types/api';

export default function ExpertReviewed() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'COMPLETED', 'mine', page],
    queryFn: () => listReviews({ status: 'COMPLETED', mine: true, page, pageSize: 10 }),
  });

  const columns: Column<ReviewListItem>[] = [
    {
      key: 'case',
      header: 'Case',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={r.analysis.thumbUrl} alt="" className="w-11 h-11 rounded-lg object-cover border border-white/10" loading="lazy" />
          <div>
            <p className="font-display font-600 text-cream text-sm whitespace-nowrap">
              {r.analysis.cropType.emoji} {r.analysis.cropType.name} · {r.analysis.farmerName}
            </p>
            <p className="text-[11px] text-muted/70 font-mono">{fmtDateTime(r.completedAt)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Your decision',
      render: (r) => (
        <Badge color={r.decision === 'APPROVE_AI' ? 'green' : 'violet'}>
          {r.decision === 'APPROVE_AI' ? '✓ Approved AI' : '✎ Corrected'}
        </Badge>
      ),
    },
    {
      key: 'final',
      header: 'Final disease',
      hideBelow: 'md',
      render: (r) => <span className="text-sm text-cream/90">{r.finalDisease?.name ?? r.analysis.ai?.predictedLabel ?? '—'}</span>,
    },
    {
      key: 'go',
      header: '',
      render: () => <span className="text-neon text-sm">→</span>,
    },
  ];

  const meta = data?.__meta;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">✅ Reviewed cases</h1>
        <p className="text-sm text-muted mt-1">Your completed validations — each one delivered a final plan to a farmer.</p>
      </div>

      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        emptyMessage="No completed reviews yet — claim a case from the queue to get started."
        onRowClick={(r) => navigate(`/expert/cases/${r.id}`)}
      />
      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
    </div>
  );
}
