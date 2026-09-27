// Analysis history — paginated, filterable, real data.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCrops, listAnalyses } from '../../api/endpoints';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Select } from '../../components/ui/Input';
import { StatusBadge, MockBadge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { fmtDateTime, fmtPercent } from '../../lib/format';
import type { AnalysisSummary } from '../../types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'AI_COMPLETED', label: 'AI completed' },
  { value: 'EXPERT_REVIEW_PENDING', label: 'Expert review pending' },
  { value: 'EXPERT_REVIEWED', label: 'Expert reviewed' },
  { value: 'FAILED', label: 'Failed' },
];

export default function History() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [cropTypeId, setCropTypeId] = useState('');
  const pageSize = 10;

  const { data: crops } = useQuery({ queryKey: ['crops'], queryFn: getCrops });
  const { data, isLoading } = useQuery({
    queryKey: ['analyses', 'history', page, status, cropTypeId],
    queryFn: () => listAnalyses({ page, pageSize, status: status || undefined, cropTypeId: cropTypeId || undefined }),
  });

  const columns: Column<AnalysisSummary>[] = [
    {
      key: 'crop',
      header: 'Sample',
      render: (a) => (
        <div className="flex items-center gap-3">
          <img src={a.thumbUrl} alt="" className="w-11 h-11 rounded-lg object-cover border border-white/10" loading="lazy" />
          <div>
            <p className="font-display font-600 text-cream text-sm whitespace-nowrap">{a.cropType.emoji} {a.cropType.name}</p>
            <p className="text-[11px] text-muted/70 font-mono">{fmtDateTime(a.createdAt)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'AI result',
      render: (a) =>
        a.aiSummary ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-cream/90">{a.aiSummary.healthy ? '🌿 Healthy' : a.aiSummary.predictedLabel}</span>
            {a.aiSummary.isMock && <MockBadge label="SIM" className="!px-1.5 !py-0.5 !text-[9px]" />}
          </div>
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      hideBelow: 'md',
      render: (a) =>
        a.aiSummary ? (
          <span className={`font-mono text-sm ${a.aiSummary.confidence >= 0.75 ? 'text-neon' : a.aiSummary.confidence >= 0.6 ? 'text-amber' : 'text-danger'}`}>
            {fmtPercent(a.aiSummary.confidence, 0)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge status={a.status} />,
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🗂 Analysis history</h1>
          <p className="text-sm text-muted mt-1">Every sample you've submitted, with live status and results.</p>
        </div>
        <ButtonLink to="/app/analyze">🔬 New analysis</ButtonLink>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select className="!w-auto min-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select className="!w-auto min-w-[180px]" value={cropTypeId} onChange={(e) => { setCropTypeId(e.target.value); setPage(1); }}>
          <option value="">All crops</option>
          {crops?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        emptyMessage="No analyses match these filters yet — submit your first crop photo!"
        onRowClick={(a) => navigate(`/app/analyses/${a.id}`)}
      />

      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}
    </div>
  );
}
