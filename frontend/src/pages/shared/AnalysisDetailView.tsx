// Shared analysis detail renderer — used by the farmer result page and the
// admin monitor. All data comes from the real API payload (signed media URLs,
// AI result, expert review, guidance, timeline).
import { useState } from 'react';
import { GlassCard, Panel } from '../../components/ui/Card';
import { Badge, MockBadge, PathogenBadge, SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { ConfidenceRing, SeverityMeter } from '../../components/ui/ConfidenceRing';
import { Tabs } from '../../components/ui/Tabs';
import { fmtDateTime, fmtPercent, titleCase } from '../../lib/format';
import { cn } from '../../lib/cn';
import type { AnalysisDetail } from '../../types/api';

function Bullet({ color = '#39ff88', children }: { color?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-muted leading-relaxed">
      <span className="mt-1 shrink-0" style={{ color }}>◆</span>
      <span>{children}</span>
    </li>
  );
}

export function GuidancePanel({ analysis }: { analysis: AnalysisDetail }) {
  const [tab, setTab] = useState(analysis.guidances.some((g) => g.source === 'EXPERT') ? 'EXPERT' : 'AI');
  const guidance = analysis.guidances.filter((g) => g.source === tab);
  const g = guidance[guidance.length - 1];

  const tabs = [
    { key: 'AI', label: '🤖 AI Guidance' },
    { key: 'EXPERT', label: '🧑‍🔬 Expert Guidance', count: analysis.guidances.filter((x) => x.source === 'EXPERT').length || undefined },
  ];

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h3 className="font-display font-700 text-cream text-lg">Treatment & Prevention Guidance</h3>
        <Tabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {!g ? (
        <p className="text-sm text-muted py-6 text-center">
          {tab === 'EXPERT' ? 'No expert guidance yet for this analysis.' : 'Guidance will appear once the AI analysis completes.'}
        </p>
      ) : (
        <div className="space-y-6">
          {g.title && (
            <p className="text-xs font-mono text-muted/70">
              source: {g.source === 'AI' ? 'VORTEX AI' : 'Expert-validated'} · generated {fmtDateTime(g.createdAt)}
            </p>
          )}
          {g.steps.treatment && g.steps.treatment.length > 0 && (
            <div>
              <h4 className="text-sm font-display font-700 text-neon mb-3">💊 Treatment steps</h4>
              <ul className="space-y-2">{g.steps.treatment.map((s, i) => <Bullet key={i}>{s}</Bullet>)}</ul>
            </div>
          )}
          {g.steps.prevention && g.steps.prevention.length > 0 && (
            <div>
              <h4 className="text-sm font-display font-700 text-cyan mb-3">🛡 Preventive measures</h4>
              <ul className="space-y-2">{g.steps.prevention.map((s, i) => <Bullet key={i} color="#22d3ee">{s}</Bullet>)}</ul>
            </div>
          )}
          {g.steps.safety && g.steps.safety.length > 0 && (
            <div>
              <h4 className="text-sm font-display font-700 text-amber mb-3">⚠ Safety notes</h4>
              <ul className="space-y-2">{g.steps.safety.map((s, i) => <Bullet key={i} color="#ffb020">{s}</Bullet>)}</ul>
            </div>
          )}
          {g.steps.expertComments && g.steps.expertComments.length > 0 && (
            <div>
              <h4 className="text-sm font-display font-700 text-violet mb-3">🧑‍🔬 Expert comments</h4>
              <ul className="space-y-2">{g.steps.expertComments.map((s, i) => <Bullet key={i} color="#a855f7">{s}</Bullet>)}</ul>
            </div>
          )}
          {g.steps.disclaimer && (
            <p className="text-[11px] text-muted/60 border-t border-white/5 pt-4 leading-relaxed">{g.steps.disclaimer}</p>
          )}
        </div>
      )}
    </Panel>
  );
}

export function AnalysisTimeline({ analysis }: { analysis: AnalysisDetail }) {
  return (
    <GlassCard>
      <h3 className="font-display font-700 text-cream mb-5">Case timeline</h3>
      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-neon/50 via-cyan/30 to-transparent" aria-hidden />
        {analysis.timeline.map((t) => (
          <div key={t.key} className="relative pb-5 last:pb-0">
            <span
              className={cn(
                'absolute -left-6 top-1 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center text-[9px]',
                t.done ? 'border-neon bg-neon/20 text-neon' : t.active ? 'border-amber bg-amber/10 text-amber animate-pulse' : 'border-white/20 bg-void text-muted/50',
              )}
            >
              {t.done ? '✓' : t.active ? '●' : '○'}
            </span>
            <p className={cn('text-sm font-display font-600', t.done ? 'text-cream' : t.active ? 'text-amber' : 'text-muted/60')}>{t.label}</p>
            <p className="text-[11px] text-muted/60 font-mono mt-0.5">{t.at ? fmtDateTime(t.at) : 'pending'}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function AnalysisDetailView({
  analysis,
  actions,
  showFarmer = false,
}: {
  analysis: AnalysisDetail;
  actions?: React.ReactNode;
  showFarmer?: boolean;
}) {
  const ai = analysis.aiResult;
  const review = analysis.expertReview;
  const finalDisease = review?.status === 'COMPLETED' ? review.finalDisease : null;
  const effectiveLabel = finalDisease?.name ?? ai?.predictedLabel ?? '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={analysis.status} />
            {ai?.isMock && <MockBadge />}
            <Badge color="grey">{analysis.cropType.emoji} {analysis.cropType.name}</Badge>
          </div>
          <h2 className="mt-2.5 text-2xl md:text-3xl font-display font-700 text-cream truncate">
            {effectiveLabel}
          </h2>
          <p className="text-xs text-muted font-mono mt-1">
            ID {analysis.id.slice(-10)} · submitted {fmtDateTime(analysis.createdAt)}
            {analysis.locationText ? ` · ${analysis.locationText}` : ''}
          </p>
        </div>
        {actions && <div className="flex gap-3 flex-wrap shrink-0">{actions}</div>}
      </div>

      {analysis.status === 'FAILED' && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 text-sm text-danger">
          ⚠ Analysis failed: {analysis.failureReason ?? 'Unknown error'} — your image is safe, please submit a new analysis.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left column: image + timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Panel className="!p-4">
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-void">
              <img src={analysis.image.url} alt={`Crop sample — ${analysis.cropType.name}`} className="w-full max-h-[420px] object-contain" loading="lazy" />
              {ai && (
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <Badge color="grey">{analysis.image.width}×{analysis.image.height}</Badge>
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted/70 font-mono truncate">
              {analysis.image.originalName} · private signed link (expires in 6 h)
            </p>
            {(analysis.symptoms || analysis.notes) && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                {analysis.symptoms && (
                  <p className="text-xs text-muted"><span className="text-cream/80 font-600">Farmer symptoms:</span> “{analysis.symptoms}”</p>
                )}
                {analysis.notes && (
                  <p className="text-xs text-muted"><span className="text-cream/80 font-600">Notes:</span> {analysis.notes}</p>
                )}
              </div>
            )}
          </Panel>

          {showFarmer && analysis.farmer && (
            <GlassCard>
              <h3 className="font-display font-700 text-cream mb-3">Farmer</h3>
              <p className="text-sm text-cream/90">{analysis.farmer.fullName}</p>
              {analysis.farmer.location && <p className="text-xs text-muted mt-1">📍 {analysis.farmer.location}</p>}
            </GlassCard>
          )}

          <AnalysisTimeline analysis={analysis} />
        </div>

        {/* Right column: AI + review + guidance */}
        <div className="lg:col-span-3 space-y-6">
          {ai && (
            <Panel>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <h3 className="font-display font-700 text-cream text-lg">
                  🤖 AI Analysis <span className="text-xs font-mono text-muted/60 ml-2">provider: {ai.provider}{ai.modelVersion ? ` · ${ai.modelVersion}` : ''}</span>
                </h3>
                {ai.isMock && <MockBadge label="SIMULATED — dev fallback, not a real diagnosis" />}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-7">
                <ConfidenceRing value={ai.confidence} />
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-display font-600">Predicted condition</p>
                    <p className="text-xl font-display font-700 mt-1" style={{ color: ai.healthy ? '#39ff88' : '#ffb020' }}>
                      {ai.predictedLabel}
                    </p>
                    {ai.disease && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <PathogenBadge type={ai.disease.pathogenType} />
                        {ai.processingTimeMs != null && <Badge color="grey">{(ai.processingTimeMs / 1000).toFixed(1)}s analysis</Badge>}
                      </div>
                    )}
                  </div>
                  <SeverityMeter severity={ai.severity} />
                </div>
              </div>

              {ai.indicators.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-display font-700 text-cyan mb-2.5">◈ Visual indicators detected</h4>
                  <ul className="space-y-1.5">{ai.indicators.map((ind, i) => <Bullet key={i} color="#22d3ee">{ind}</Bullet>)}</ul>
                </div>
              )}

              {ai.reasoning && (
                <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-display font-600 mb-1.5">AI reasoning</p>
                  <p className="text-sm text-cream/85 leading-relaxed">{ai.reasoning}</p>
                </div>
              )}

              {ai.needsExpertReview && (
                <p className="mt-4 text-xs text-amber flex items-center gap-2">
                  <span className="animate-pulse">⚠</span>
                  Confidence below the review threshold — this case was routed to a human expert for validation.
                </p>
              )}
            </Panel>
          )}

          {ai?.disease && !finalDisease && (
            <GlassCard>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display font-700 text-cream text-lg">🦠 {ai.disease.name}</h3>
                <div className="flex gap-2">
                  <PathogenBadge type={ai.disease.pathogenType} />
                  <SeverityBadge severity={ai.disease.defaultSeverity} />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted leading-relaxed">{ai.disease.description}</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4 text-xs text-muted leading-relaxed">
                <div><p className="text-cream/80 font-600 mb-1">Typical symptoms</p>{ai.disease.symptoms}</div>
                {ai.disease.visibleSigns && <div><p className="text-cream/80 font-600 mb-1">Visible signs</p>{ai.disease.visibleSigns}</div>}
              </div>
            </GlassCard>
          )}

          {review && (
            <Panel className={cn(review.status === 'COMPLETED' ? 'border-violet/30' : 'border-amber/25')}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="font-display font-700 text-cream text-lg">🧑‍🔬 Expert Review</h3>
                <StatusBadge status={review.status} />
              </div>

              {review.status !== 'COMPLETED' ? (
                <div className="text-sm text-muted leading-relaxed space-y-2">
                  <p>
                    {review.status === 'PENDING'
                      ? 'This case is in the expert queue and will be claimed by a plant pathologist shortly.'
                      : 'A plant pathologist is currently reviewing this case.'}
                  </p>
                  {review.confidenceNote && (
                    <p className="text-xs font-mono text-amber/80">reason: {review.confidenceNote}</p>
                  )}
                  {review.requestedByFarmer && <Badge color="cyan">Requested by farmer</Badge>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2.5">
                    <Badge color={review.decision === 'APPROVE_AI' ? 'green' : 'violet'}>
                      {review.decision === 'APPROVE_AI' ? '✓ AI result approved' : '✎ AI result corrected'}
                    </Badge>
                    {review.finalDisease && <Badge color="cyan">Final: {review.finalDisease.name}</Badge>}
                    {review.finalSeverity && <SeverityBadge severity={review.finalSeverity} />}
                  </div>
                  {review.expert && (
                    <p className="text-xs text-muted">
                      Reviewed by <span className="text-cream font-600">{review.expert.fullName}</span>
                      {review.expert.specialization ? ` · ${review.expert.specialization}` : ''}
                      {review.completedAt ? ` · ${fmtDateTime(review.completedAt)}` : ''}
                    </p>
                  )}
                  {review.confidenceNote && (
                    <p className="text-sm text-muted"><span className="text-cream/80 font-600">Confidence note:</span> {review.confidenceNote}</p>
                  )}
                  {review.comments && (
                    <div className="rounded-xl bg-violet/[0.06] border border-violet/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-violet font-display font-600 mb-1">Expert comments</p>
                      <p className="text-sm text-cream/85 leading-relaxed">{review.comments}</p>
                    </div>
                  )}
                  {finalDisease && (
                    <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted leading-relaxed border-t border-white/5 pt-4">
                      <div><p className="text-cream/80 font-600 mb-1">{finalDisease.name} — about</p>{finalDisease.description}</div>
                      <div><p className="text-cream/80 font-600 mb-1">Pathogen</p>{titleCase(finalDisease.pathogenType)} · typical severity {titleCase(finalDisease.defaultSeverity)}</div>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {analysis.status !== 'PROCESSING' && <GuidancePanel analysis={analysis} />}

          {ai && (
            <p className="text-[11px] text-muted/60 leading-relaxed text-center">
              AI confidence {fmtPercent(ai.confidence)} — VORTEX results are decision support, not a substitute for
              local agricultural advice. Always follow product labels and consult your extension officer for large-scale application.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
