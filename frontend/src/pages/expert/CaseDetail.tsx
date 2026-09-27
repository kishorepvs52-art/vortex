// Expert case detail — evidence panel + claim + review submission form.
// The submitted review becomes the farmer's final expert-validated result.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claimReview, getCropDiseases, getReviewCase, submitReview } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { AnalysisDetailView } from '../shared/AnalysisDetailView';
import { Panel, GlassCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Select, Textarea } from '../../components/ui/Input';
import { Badge, SeverityBadge } from '../../components/ui/Badge';
import { PageLoader, ErrorState } from '../../components/ui/Feedback';
import { toast } from '../../store/toastStore';
import { cn } from '../../lib/cn';
import { fmtPercent } from '../../lib/format';
import type { ReviewDecision, Severity } from '../../types/api';

export default function ExpertCaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['review-case', id],
    queryFn: () => getReviewCase(id!),
    enabled: Boolean(id),
  });

  const review = data?.review as
    | { id: string; status: string; decision: string | null; isMine: boolean; requestedByFarmer: boolean; confidenceNote: string | null; treatmentGuidance: string | null; preventiveAdvice: string | null; comments: string | null; finalSeverity: string | null; finalDisease: { id: string; name: string } | null }
    | undefined;
  const analysis = data?.analysis;

  const { data: diseases } = useQuery({
    queryKey: ['crop-diseases', analysis?.cropType.id],
    queryFn: () => getCropDiseases(analysis!.cropType.id),
    enabled: Boolean(analysis?.cropType.id),
  });

  // ── review form state ──
  const [decision, setDecision] = useState<ReviewDecision>('APPROVE_AI');
  const [finalDiseaseId, setFinalDiseaseId] = useState('');
  const [finalSeverity, setFinalSeverity] = useState<Severity>('MODERATE');
  const [treatment, setTreatment] = useState('');
  const [prevention, setPrevention] = useState('');
  const [comments, setComments] = useState('');

  // Prefill from AI result once loaded
  useEffect(() => {
    if (!analysis?.aiResult || !review) return;
    setFinalDiseaseId(review.finalDisease?.id ?? analysis.aiResult.disease?.id ?? '');
    setFinalSeverity((review.finalSeverity as Severity) ?? analysis.aiResult.severity);
    const d = analysis.aiResult.disease;
    if (d) {
      setTreatment(d.treatmentSummary);
      setPrevention(d.preventiveSummary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id, review?.id]);

  const claimMut = useMutation({
    mutationFn: () => claimReview(id!),
    onSuccess: () => {
      toast.success('Case claimed', 'Locked to you — submit your expert review below.');
      qc.invalidateQueries({ queryKey: ['review-case', id] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['expert-stats'] });
    },
    onError: (e) => toast.error('Claim failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitReview(id!, {
        decision,
        finalDiseaseId: decision === 'CORRECTED' ? finalDiseaseId : finalDiseaseId || null,
        finalSeverity,
        treatmentGuidance: treatment.trim() || null,
        preventiveAdvice: prevention.trim() || null,
        comments: comments.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Review submitted ✓', 'The farmer has been notified and can now see your validated guidance.');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['expert-stats'] });
      qc.invalidateQueries({ queryKey: ['reviews-counts'] });
      navigate('/expert/cases');
    },
    onError: (e) => toast.error('Submission failed', e instanceof ApiClientError ? e.message : undefined),
  });

  if (isLoading) return <PageLoader label="Loading case" />;
  if (error || !analysis || !review) {
    return <ErrorState title="Case not found" message={error instanceof ApiClientError ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const isCompleted = review.status === 'COMPLETED';
  const canEdit = review.status === 'CLAIMED' && review.isMine;
  const correctedDisease = review.finalDisease;

  const valid =
    (decision === 'APPROVE_AI' || Boolean(finalDiseaseId)) &&
    (canEdit || isCompleted ? true : false);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/expert/cases" className="text-xs text-muted hover:text-neon transition-colors font-display font-600">
          ← Back to case queue
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          {review.requestedByFarmer && <Badge color="cyan">Farmer-requested review</Badge>}
          {review.status === 'PENDING' && (
            <Button loading={claimMut.isPending} onClick={() => claimMut.mutate()}>
              🔒 Claim this case
            </Button>
          )}
          {review.status === 'CLAIMED' && !review.isMine && (
            <Badge color="amber">Claimed by another expert</Badge>
          )}
        </div>
      </div>

      {review.confidenceNote && (
        <div className="rounded-2xl border border-amber/30 bg-amber/[0.07] px-5 py-3.5 text-sm text-amber/90">
          ⚖️ <span className="font-600">Why this case was flagged:</span> {review.confidenceNote}
        </div>
      )}

      {/* Full evidence — image, symptoms, location, AI prediction, indicators */}
      <AnalysisDetailView analysis={analysis} showFarmer />

      {/* Review form / completed summary */}
      {isCompleted ? (
        <Panel className="border-violet/30">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="font-display font-700 text-cream text-lg">✅ Your submitted review</h2>
            <Badge color={review.decision === 'APPROVE_AI' ? 'green' : 'violet'}>
              {review.decision === 'APPROVE_AI' ? 'AI result approved' : 'AI result corrected'}
            </Badge>
            {review.finalSeverity && <SeverityBadge severity={review.finalSeverity as Severity} />}
            {correctedDisease && <Badge color="cyan">Final: {correctedDisease.name}</Badge>}
            {analysis.aiResult && <span className="text-[11px] font-mono text-muted/60 ml-auto">AI confidence was {fmtPercent(analysis.aiResult.confidence)}</span>}
          </div>
          {review.treatmentGuidance && (
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted leading-relaxed">
              <div><p className="text-neon font-600 text-xs uppercase tracking-wider mb-1.5">Treatment guidance</p><p className="whitespace-pre-line">{review.treatmentGuidance}</p></div>
              <div><p className="text-cyan font-600 text-xs uppercase tracking-wider mb-1.5">Preventive advice</p><p className="whitespace-pre-line">{review.preventiveAdvice ?? '—'}</p></div>
            </div>
          )}
          {review.comments && (
            <p className="mt-4 text-sm text-cream/85 border-t border-white/5 pt-4"><span className="text-violet font-600">Comments:</span> {review.comments}</p>
          )}
        </Panel>
      ) : canEdit ? (
        <GlassCard className="border-violet/25">
          <h2 className="font-display font-700 text-cream text-lg mb-1">📝 Submit expert review</h2>
          <p className="text-xs text-muted mb-6">Your decision replaces the AI result for the farmer and is attributed to you.</p>

          <div className="space-y-5">
            {/* Decision */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(['APPROVE_AI', 'CORRECTED'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDecision(d)}
                  className={cn(
                    'glass p-4 rounded-2xl text-left border transition-all',
                    decision === d ? (d === 'APPROVE_AI' ? 'border-neon/60 shadow-neon bg-neon/[0.06]' : 'border-violet/60 shadow-[0_0_16px_rgba(168,85,247,0.25)] bg-violet/[0.06]') : 'hover:border-white/25',
                  )}
                >
                  <span className={cn('block font-display font-700 text-sm', decision === d ? (d === 'APPROVE_AI' ? 'text-neon' : 'text-violet') : 'text-cream')}>
                    {d === 'APPROVE_AI' ? '✓ Approve the AI result' : '✎ Correct the diagnosis'}
                  </span>
                  <span className="block text-[11px] text-muted mt-1 leading-snug">
                    {d === 'APPROVE_AI'
                      ? `Confirm "${analysis.aiResult?.predictedLabel ?? 'the AI label'}" at ${fmtPercent(analysis.aiResult?.confidence ?? 0, 0)} confidence.`
                      : 'Select the true disease from the crop catalogue and adjust the plan.'}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Final disease" required={decision === 'CORRECTED'} hint={decision === 'APPROVE_AI' ? 'Pre-filled from the AI match — adjust if needed' : 'Must belong to this crop'}>
                {(fid) => (
                  <Select id={fid} value={finalDiseaseId} onChange={(e) => setFinalDiseaseId(e.target.value)} disabled={!canEdit}>
                    <option value="">— select disease —</option>
                    {diseases?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.pathogenType.toLowerCase()})</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Final severity" required>
                {(fid) => (
                  <Select id={fid} value={finalSeverity} onChange={(e) => setFinalSeverity(e.target.value as Severity)} disabled={!canEdit}>
                    {(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Treatment guidance" hint="One step per line — dosages, intervals, organic/chemical options">
              {(fid) => <Textarea id={fid} rows={5} value={treatment} onChange={(e) => setTreatment(e.target.value)} disabled={!canEdit} placeholder={'Spray mancozeb 2.5 g/L water.\nRepeat after 10 days…'} />}
            </Field>
            <Field label="Preventive advice" hint="One measure per line — for this season and the next">
              {(fid) => <Textarea id={fid} rows={4} value={prevention} onChange={(e) => setPrevention(e.target.value)} disabled={!canEdit} placeholder={'Rotate with non-solanaceous crops.\nStake and mulch plants…'} />}
            </Field>
            <Field label="Comments for the farmer" hint="Optional — anything else they should know">
              {(fid) => <Textarea id={fid} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} disabled={!canEdit} placeholder="Act within a week; scout neighbouring rows too…" />}
            </Field>

            <div className="flex gap-3 flex-wrap pt-2">
              <Button loading={submitMut.isPending} disabled={!valid} onClick={() => submitMut.mutate()}>
                🎓 Submit review & notify farmer
              </Button>
              <Button variant="ghost" onClick={() => navigate('/expert/cases')}>Cancel</Button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <Panel className="text-center">
          <p className="text-sm text-muted">
            {review.status === 'PENDING'
              ? 'Claim this case to unlock the expert review form.'
              : 'This case is being reviewed by another expert.'}
          </p>
        </Panel>
      )}
    </div>
  );
}
