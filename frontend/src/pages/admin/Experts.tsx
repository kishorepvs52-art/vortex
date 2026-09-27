// Admin — expert approvals & management.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApproveExpert, adminDeactivateExpert, adminExperts } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { GlassCard } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import { fmtDate, initials } from '../../lib/format';
import type { AdminExpertItem } from '../../types/api';

export default function AdminExperts() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'active'>('pending');
  const [deactTarget, setDeactTarget] = useState<AdminExpertItem | null>(null);

  const { data: experts, isLoading } = useQuery({
    queryKey: ['admin-experts', tab],
    queryFn: () => adminExperts(tab),
  });
  const { data: pendingCount } = useQuery({
    queryKey: ['admin-experts-count'],
    queryFn: async () => (await adminExperts('pending')).length,
    refetchInterval: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: adminApproveExpert,
    onSuccess: () => {
      toast.success('Expert approved', 'They can now sign in and claim cases.');
      qc.invalidateQueries({ queryKey: ['admin-experts'] });
      qc.invalidateQueries({ queryKey: ['admin-experts-count'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => toast.error('Approval failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const deactMut = useMutation({
    mutationFn: adminDeactivateExpert,
    onSuccess: () => {
      toast.info('Expert deactivated');
      setDeactTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-experts'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => toast.error('Failed', e instanceof ApiClientError ? e.message : undefined),
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🧑‍🔬 Experts</h1>
        <p className="text-sm text-muted mt-1">
          Verify credentials before approving — approved experts see every pending case in the platform queue.
        </p>
      </div>

      <Tabs
        items={[
          { key: 'pending', label: '⏳ Pending approval', count: pendingCount },
          { key: 'active', label: '✅ Active experts' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as 'pending' | 'active')}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !experts?.length ? (
        <EmptyState
          icon={tab === 'pending' ? '🎉' : '🧑‍🔬'}
          title={tab === 'pending' ? 'No pending expert registrations' : 'No active experts yet'}
          message={tab === 'pending' ? 'New expert signups will appear here for credential verification.' : 'Approve a pending expert to build the review bench.'}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {experts.map((x) => (
            <GlassCard key={x.id} hover className={tab === 'pending' ? 'border-amber/25' : ''}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet/60 to-cyan-dim flex items-center justify-center text-sm font-bold text-void shrink-0">
                  {initials(x.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-700 text-cream">{x.fullName}</p>
                    <Badge color={x.isActive ? 'green' : 'amber'}>{x.isActive ? 'Active' : 'Pending'}</Badge>
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5 truncate">{x.email}</p>
                  {x.profile && (
                    <div className="mt-3 space-y-1 text-xs text-muted">
                      <p><span className="text-cream/80 font-600">Specialization:</span> {x.profile.specialization}</p>
                      {x.profile.qualification && <p><span className="text-cream/80 font-600">Qualification:</span> {x.profile.qualification}</p>}
                      {x.profile.licenseNumber && <p><span className="text-cream/80 font-600">License:</span> <span className="font-mono">{x.profile.licenseNumber}</span></p>}
                      {x.profile.yearsExperience != null && <p><span className="text-cream/80 font-600">Experience:</span> {x.profile.yearsExperience} yrs</p>}
                      {x.profile.bio && <p className="italic text-muted/80 leading-relaxed">“{x.profile.bio}”</p>}
                    </div>
                  )}
                  <p className="text-[11px] text-muted/60 font-mono mt-3">
                    registered {fmtDate(x.createdAt)}{x.isActive ? ` · ${x.reviewsCompleted} reviews completed` : ''}
                  </p>
                  <div className="mt-4 flex gap-2.5 flex-wrap">
                    {x.isActive ? (
                      <Button size="sm" variant="danger" onClick={() => setDeactTarget(x)}>Deactivate</Button>
                    ) : (
                      <Button size="sm" loading={approveMut.isPending} onClick={() => approveMut.mutate(x.id)}>
                        ✔ Approve expert
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deactTarget)}
        onClose={() => setDeactTarget(null)}
        onConfirm={() => deactTarget && deactMut.mutate(deactTarget.id)}
        loading={deactMut.isPending}
        danger
        title={`Deactivate ${deactTarget?.fullName}?`}
        confirmLabel="Deactivate"
        message="They will lose expert access immediately. Completed reviews stay attributed and visible."
      />
    </div>
  );
}
