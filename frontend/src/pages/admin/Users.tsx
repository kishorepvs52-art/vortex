// Admin — user management: search, filter, role change, activate/deactivate.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUpdateUser, adminUsers } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { DataTable, Pagination, type Column } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import { fmtDate, initials } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import type { AdminUserItem, Role } from '../../types/api';

export default function AdminUsers() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editing, setEditing] = useState<AdminUserItem | null>(null);
  const [editRole, setEditRole] = useState<Role>('FARMER');
  const [confirmDeact, setConfirmDeact] = useState<AdminUserItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, role, active, q],
    queryFn: () => adminUsers({ page, role: role || undefined, active: active || undefined, q: q || undefined }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => adminUpdateUser(id, patch),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setEditing(null);
      setConfirmDeact(null);
    },
    onError: (e) => toast.error('Update failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const columns: Column<AdminUserItem>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-deep-green to-neon-dark flex items-center justify-center text-xs font-bold text-neon shrink-0">
            {initials(u.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-display font-600 text-cream truncate">{u.fullName}</p>
            <p className="text-[11px] text-muted/70 truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge color={u.role === 'ADMIN' ? 'amber' : u.role === 'EXPERT' ? 'violet' : 'green'}>{u.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge color={u.isActive ? 'green' : 'red'}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${u.isActive ? '' : 'animate-pulse'}`} />
          {u.isActive ? 'Active' : u.role === 'EXPERT' ? 'Pending/Off' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'activity',
      header: 'Activity',
      hideBelow: 'md',
      render: (u) => (
        <span className="text-xs text-muted font-mono">
          {u.analysesCount} analyses · {u.reviewsCount} reviews
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      hideBelow: 'lg',
      render: (u) => <span className="text-xs text-muted">{fmtDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => { setEditing(u); setEditRole(u.role); }}>Edit</Button>
          {u.id !== me?.id && (
            <Button size="sm" variant={u.isActive ? 'danger' : 'primary'}
              onClick={() => (u.isActive ? setConfirmDeact(u) : updateMut.mutate({ id: u.id, patch: { isActive: true } }))}>
              {u.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const meta = data?.__meta;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">👥 Users</h1>
        <p className="text-sm text-muted mt-1">Manage every account on the platform. Deactivated users are signed out and blocked at the API.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <form
          onSubmit={(e) => { e.preventDefault(); setQ(searchInput); setPage(1); }}
          className="flex-1 min-w-[200px] max-w-sm"
        >
          <Input placeholder="Search name or email… (Enter)" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </form>
        <Select className="!w-auto min-w-[150px]" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="FARMER">Farmers</option>
          <option value="EXPERT">Experts</option>
          <option value="ADMIN">Admins</option>
        </Select>
        <Select className="!w-auto min-w-[150px]" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
          <option value="">Active + inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </Select>
      </div>

      <DataTable columns={columns} rows={data} loading={isLoading} emptyMessage="No users match these filters." />
      {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />}

      {/* Edit modal */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit — ${editing?.fullName ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              loading={updateMut.isPending}
              onClick={() => editing && updateMut.mutate({ id: editing.id, patch: { role: editRole } })}
              disabled={editRole === editing?.role}
            >
              Save role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Email: <span className="text-cream font-mono">{editing?.email}</span>
          </p>
          <div>
            <p className="text-xs font-display font-600 uppercase tracking-[0.12em] text-muted mb-2">Role</p>
            <div className="grid grid-cols-3 gap-2">
              {(['FARMER', 'EXPERT', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setEditRole(r)}
                  className={`glass px-3 py-2.5 rounded-xl text-xs font-display font-600 transition-all ${editRole === r ? 'border-neon/60 text-neon shadow-neon' : 'text-muted hover:text-cream'}`}
                >
                  {r === 'FARMER' ? '👨‍🌾' : r === 'EXPERT' ? '🧑‍🔬' : '🛡️'} {r}
                </button>
              ))}
            </div>
            {editing?.id === me?.id && <p className="text-[11px] text-amber mt-2">⚠ You cannot change your own role.</p>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeact)}
        onClose={() => setConfirmDeact(null)}
        onConfirm={() => confirmDeact && updateMut.mutate({ id: confirmDeact.id, patch: { isActive: false } })}
        loading={updateMut.isPending}
        danger
        title={`Deactivate ${confirmDeact?.fullName}?`}
        confirmLabel="Deactivate"
        message="The account will be immediately signed out and blocked from all APIs. Data is preserved — you can reactivate later."
      />
    </div>
  );
}
