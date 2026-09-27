// Admin — monitor every analysis on the platform.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyses } from '../../api/endpoints';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Select } from '../../components/ui/Input';
import { StatusBadge, MockBadge, Badge } from '../../components/ui/Badge';
import { fmtDateTime, fmtPercent } from '../../lib/format';
import type { AnalysisSummary } from '../../types/api';

type AdminRow = AnalysisSummary & { farmer: { fullName: string; email: string }; reviewStatus: string | null };

export default function AdminAnalyses() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analyses', page, status, provider],
    queryFn: () => adminAnalyses({ page, status: status || undefined, provider: provider || undefined }),
  });

  const columns: Column<AdminRow>[] = [
    {
      key: 'sample',
      header: 'Sample',
      render: (a) => (
        <div className="flex items-center gap-3">
          <img src={a.thumbUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" loading="lazy" />
          <div>
            <p className="text-sm font-display font-600 text-cream whitespace-nowrap">{a.cropType.emoji} {a.cropType.name}</p>
            <p className="text-[11px] text-muted/70 font-mono">{fmtDateTime(a.createdAt)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'farmer',
      header: 'Farmer',
      hideBelow: 'md',
      render: (a) => (
        <div>
          <p className="text-sm text-cream/90">{a.farmer.fullName}</p>
          <p className="text-[11px] text-muted/70">{a.farmer.email}</p>
        </div>
      ),
    },
    {
      key: 'ai',
      header: 'AI result',
      render: (a) =>
        a.aiSummary ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-cream/90">{a.aiSummary.healthy ? '🌿 Healthy' : a.aiSummary.predictedLabel}</span>
            <span className="font-mono text-xs text-muted">{fmtPercent(a.aiSummary.confidence, 0)}</span>
            {a.aiSummary.isMock && <MockBadge label="SIM" className="!px-1.5 !py-0.5 !text-[9px]" />}
          </div>
        ) : (
          <span className="text-xs text-muted">{a.status === 'PROCESSING' ? 'analyzing…' : '—'}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={a.status} />
          {a.reviewStatus && a.reviewStatus !== 'COMPLETED' && <Badge color="amber">review {a.reviewStatus.toLowerCase()}</Badge>}
        </div>
      ),
    },
    { key: 'go', header: '', render: () => <span className="text-neon text-sm">→</span> },
  ];

  const meta = data?.__meta;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🔬 Analyses monitor</h1>
        <p className="text-sm text-muted mt-1">Every analysis on the platform — filter by pipeline status or AI provider.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select className="!w-auto min-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="PROCESSING">Processing</option>
          <option value="AI_COMPLETED">AI completed</option>
          <option value="EXPERT_REVIEW_PENDING">Expert review pending</option>
          <option value="EXPERT_REVIEWED">Expert reviewed</option>
          <option value="FAILED">Failed</option>
        </Select>
        <Select className="!w-auto min-w-[180px]" value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}>
          <option value="">All AI providers</option>
          <option value="mock">Simulated (mock)</option>
          <option value="real">Real provider</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data as AdminRow[] | undefined}
        loading={isLoading}
        emptyMessage="No analyses match these filters."
        onRowClick={(a) => navigate(`/admin/analyses/${a.id}`)}
      />
      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
    </div>
  );
}
