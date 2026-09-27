// Admin — full analysis detail (read-only monitor view).
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAnalysisDetail } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { AnalysisDetailView } from '../shared/AnalysisDetailView';
import { PageLoader, ErrorState } from '../../components/ui/Feedback';

export default function AdminAnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-analysis', id],
    queryFn: () => adminAnalysisDetail(id!),
    enabled: Boolean(id),
  });

  if (isLoading) return <PageLoader label="Loading analysis" />;
  if (error || !data) {
    return <ErrorState title="Analysis not found" message={error instanceof ApiClientError ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="animate-fade-up">
      <Link to="/admin/analyses" className="inline-block text-xs text-muted hover:text-neon transition-colors font-display font-600 mb-5">
        ← Back to analyses monitor
      </Link>
      <AnalysisDetailView analysis={data} showFarmer />
    </div>
  );
}
