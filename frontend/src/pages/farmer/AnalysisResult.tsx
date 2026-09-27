// Farmer diagnosis result page — real AI result, expert review, guidance,
// plus farmer actions (request expert review, analyze another).
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAnalysis, requestReview } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { AnalysisDetailView } from '../shared/AnalysisDetailView';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageLoader, ErrorState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';

export default function AnalysisResult() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.status === 'PROCESSING' ? 2000 : false),
  });

  const onRequestReview = async () => {
    if (!id) return;
    setRequesting(true);
    try {
      await requestReview(id);
      toast.success('Expert review requested', 'A plant pathologist will validate this diagnosis. You\'ll be notified when it\'s done.');
      await qc.invalidateQueries({ queryKey: ['analysis', id] });
      setConfirmOpen(false);
    } catch (e) {
      toast.error('Could not request review', e instanceof ApiClientError ? e.message : 'Please try again');
    } finally {
      setRequesting(false);
    }
  };

  if (isLoading) return <PageLoader label="Loading analysis" />;
  if (error || !analysis) {
    return (
      <ErrorState
        title="Analysis not found"
        message={error instanceof ApiClientError ? error.message : 'This analysis may have been removed.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const canRequestReview =
    analysis.status === 'AI_COMPLETED' ||
    (analysis.status === 'FAILED' && false);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <Link to="/app/history" className="text-xs text-muted hover:text-neon transition-colors font-display font-600">
          ← Back to history
        </Link>
        <ButtonLink to="/app/analyze" variant="secondary" size="sm">+ New analysis</ButtonLink>
      </div>

      <AnalysisDetailView
        analysis={analysis}
        actions={
          canRequestReview ? (
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              🧑‍🔬 Request expert review
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void onRequestReview()}
        loading={requesting}
        title="Request expert validation?"
        confirmLabel="Send to expert"
        message="A qualified plant pathologist will re-examine your image, symptoms and the AI result, then issue a validated diagnosis and treatment plan. You'll get a notification when the review completes."
      />
    </div>
  );
}
