// Analysis Processing — live 3D scan scene + real status polling.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { usePerfTier } from '../../hooks/usePerfTier';
import { getAnalysis } from '../../api/endpoints';
import { toast } from '../../store/toastStore';
import { cn } from '../../lib/cn';
import { fmtPercent } from '../../lib/format';

const ScanOrb = lazy(() => import('../../components/three/ScanOrb'));

const PIPELINE_STEPS = [
  { key: 'upload', label: 'Image received & validated', detail: 'Magic-byte check · EXIF strip · resize' },
  { key: 'store', label: 'Stored in private vault', detail: 'SHA-256 fingerprint · signed URL delivery' },
  { key: 'ai', label: 'AI vision analysis running', detail: 'Lesion patterns · discoloration · crop context' },
  { key: 'match', label: 'Matching disease catalogue', detail: 'Crop-specific label → catalogue entry' },
  { key: 'route', label: 'Routing result', detail: 'Confidence ≥ threshold → guidance · else expert queue' },
];

export default function Processing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tier = usePerfTier();
  const [elapsed, setElapsed] = useState(0);

  const { data: analysis } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PROCESSING' || !status ? 1800 : false;
    },
  });

  // elapsed timer for the live feel
  useEffect(() => {
    if (!analysis || analysis.status !== 'PROCESSING') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [analysis?.status]);

  // terminal state → redirect / notify
  useEffect(() => {
    if (!analysis || analysis.status === 'PROCESSING') return;
    if (analysis.status === 'FAILED') return; // stay on page, show failure
    const t = setTimeout(() => {
      if (analysis.status === 'EXPERT_REVIEW_PENDING') {
        toast.info('Sent to expert review', `AI confidence ${fmtPercent(analysis.aiResult?.confidence ?? 0, 0)} is below the review threshold — a plant pathologist will validate it.`);
      } else {
        toast.success('Analysis complete!', 'Your result and guidance are ready.');
      }
      navigate(`/app/analyses/${analysis.id}`, { replace: true });
    }, 1400);
    return () => clearTimeout(t);
  }, [analysis, navigate]);

  const status = analysis?.status ?? 'PROCESSING';
  const failed = status === 'FAILED';
  const activeStep = failed ? 2 : status === 'PROCESSING' ? Math.min(2 + Math.floor(elapsed / 3), 4) : 5;

  return (
    <div className="max-w-4xl mx-auto animate-fade-up">
      <Panel className="relative overflow-hidden !p-0">
        <div className="grid md:grid-cols-2">
          {/* 3D scan animation */}
          <div className="relative h-72 md:h-auto min-h-[340px] border-b md:border-b-0 md:border-r border-white/10">
            {tier === 'OFF' ? (
              <div className="absolute inset-0 bg-aurora flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl animate-spin-slow inline-block">🌀</div>
                  <p className="mt-4 text-xs font-mono text-neon animate-pulse">ANALYZING…</p>
                </div>
              </div>
            ) : (
              <Suspense fallback={<div className="absolute inset-0 bg-aurora" />}>
                <ScanOrb tier={tier} />
              </Suspense>
            )}
            {/* scan line overlay */}
            {!failed && status === 'PROCESSING' && (
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-neon/15 to-transparent animate-scan-line pointer-events-none" />
            )}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <StatusBadge status={status} />
              <span className="text-[10px] font-mono text-neon/80">
                {status === 'PROCESSING' ? `T+${elapsed}s` : analysis?.cropType.name ?? ''}
              </span>
            </div>
          </div>

          {/* Pipeline checklist */}
          <div className="p-7 md:p-9">
            <h1 className="text-xl font-display font-700 text-cream">
              {failed ? 'Analysis failed' : status === 'PROCESSING' ? 'VORTEX AI is analyzing your crop…' : 'Analysis complete — opening result…'}
            </h1>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              {failed
                ? analysis?.failureReason ?? 'The pipeline hit an error. Your image is stored safely — please resubmit.'
                : 'Every stage below is a real backend operation on your uploaded image. This usually takes a few seconds.'}
            </p>

            <div className="mt-7 space-y-4">
              {PIPELINE_STEPS.map((s, i) => {
                const done = i < activeStep || (!failed && status !== 'PROCESSING');
                const active = i === activeStep && status === 'PROCESSING' && !failed;
                const errored = failed && i === activeStep;
                return (
                  <div key={s.key} className="flex items-start gap-3.5">
                    <span
                      className={cn(
                        'mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] shrink-0 transition-all duration-500',
                        errored ? 'border-danger bg-danger/15 text-danger' :
                        done ? 'border-neon bg-neon/15 text-neon' :
                        active ? 'border-cyan bg-cyan/10 text-cyan animate-pulse' :
                        'border-white/15 text-muted/40',
                      )}
                    >
                      {errored ? '✕' : done ? '✓' : active ? '●' : i + 1}
                    </span>
                    <div className={cn('transition-opacity', done || active ? 'opacity-100' : 'opacity-45')}>
                      <p className={cn('text-sm font-display font-600', errored ? 'text-danger' : done ? 'text-neon' : active ? 'text-cyan' : 'text-muted')}>
                        {s.label}
                      </p>
                      <p className="text-[11px] text-muted/60 font-mono">{errored ? (analysis?.failureReason ?? 'error') : s.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {failed && (
              <div className="mt-8 flex gap-3 flex-wrap">
                <ButtonLink to="/app/analyze">↻ Submit again</ButtonLink>
                <Link to="/app/history">
                  <Button variant="ghost">Back to history</Button>
                </Link>
              </div>
            )}

            {status !== 'PROCESSING' && !failed && (
              <div className="mt-8">
                <Button onClick={() => navigate(`/app/analyses/${analysis?.id}`, { replace: true })}>
                  View result now →
                </Button>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
