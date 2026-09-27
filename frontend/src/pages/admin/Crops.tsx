// Admin — crop type catalogue CRUD.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCreateCrop, adminCrops, adminDeleteCrop, adminUpdateCrop } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea, Checkbox } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';

interface CropRow {
  id: string;
  name: string;
  scientificName: string | null;
  family: string | null;
  description: string | null;
  emoji: string | null;
  isActive: boolean;
  diseaseCount: number;
  analysisCount: number;
}

const emptyForm = { name: '', scientificName: '', family: '', emoji: '🌱', description: '', isActive: true };

export default function AdminCrops() {
  const qc = useQueryClient();
  const { data: crops, isLoading } = useQuery({ queryKey: ['admin-crops'], queryFn: adminCrops });
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: CropRow } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<CropRow | null>(null);

  const openCreate = () => { setForm(emptyForm); setModal({ mode: 'create' }); };
  const openEdit = (row: CropRow) => {
    setForm({
      name: row.name,
      scientificName: row.scientificName ?? '',
      family: row.family ?? '',
      emoji: row.emoji ?? '🌱',
      description: row.description ?? '',
      isActive: row.isActive,
    });
    setModal({ mode: 'edit', row });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        scientificName: form.scientificName.trim() || null,
        family: form.family.trim() || null,
        emoji: form.emoji.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      return modal?.mode === 'edit' && modal.row
        ? adminUpdateCrop(modal.row.id, payload)
        : adminCreateCrop(payload);
    },
    onSuccess: () => {
      toast.success(modal?.mode === 'edit' ? 'Crop updated' : 'Crop created', 'The public catalogue and AI matching now include it.');
      qc.invalidateQueries({ queryKey: ['admin-crops'] });
      qc.invalidateQueries({ queryKey: ['crops'] });
      setModal(null);
    },
    onError: (e) => toast.error('Save failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminDeleteCrop(id),
    onSuccess: (res) => {
      toast.info(res.message ?? (res as { deactivated?: boolean }).deactivated ? 'Crop deactivated (has analysis history)' : 'Crop deleted');
      qc.invalidateQueries({ queryKey: ['admin-crops'] });
      qc.invalidateQueries({ queryKey: ['crops'] });
      setDeleting(null);
    },
    onError: (e) => toast.error('Delete failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const columns: Column<CropRow>[] = [
    {
      key: 'crop',
      header: 'Crop',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="text-2xl">{c.emoji}</span>
          <div>
            <p className="font-display font-600 text-cream text-sm">{c.name}</p>
            <p className="text-[11px] text-muted/70 italic">{c.scientificName ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'family', header: 'Family', hideBelow: 'lg', render: (c) => <span className="text-xs text-muted">{c.family ?? '—'}</span> },
    { key: 'diseases', header: 'Diseases', render: (c) => <Badge color="cyan">{c.diseaseCount}</Badge> },
    { key: 'analyses', header: 'Analyses', hideBelow: 'md', render: (c) => <span className="text-xs font-mono text-muted">{c.analysisCount}</span> },
    { key: 'status', header: 'Status', render: (c) => <Badge color={c.isActive ? 'green' : 'grey'}>{c.isActive ? 'Active' : 'Hidden'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleting(c); }}>Delete</Button>
        </div>
      ),
    },
  ];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🌾 Crop types</h1>
          <p className="text-sm text-muted mt-1">The catalogue farmers choose from and the AI matches against.</p>
        </div>
        <Button onClick={openCreate}>+ Add crop</Button>
      </div>

      <DataTable columns={columns} rows={crops as CropRow[] | undefined} loading={isLoading} emptyMessage="No crops yet — add the first one." />

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? `Edit crop — ${modal.row?.name}` : 'Add crop type'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button loading={saveMut.isPending} disabled={form.name.trim().length < 2} onClick={() => saveMut.mutate()}>
              {modal?.mode === 'edit' ? 'Save changes' : 'Create crop'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Emoji">
              {(id) => <Input id={id} value={form.emoji} onChange={set('emoji')} maxLength={4} className="text-center text-xl" />}
            </Field>
            <Field label="Name" required>
              {(id) => <Input id={id} value={form.name} onChange={set('name')} placeholder="e.g. Brinjal" />}
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Scientific name">
              {(id) => <Input id={id} value={form.scientificName} onChange={set('scientificName')} placeholder="Solanum melongena" />}
            </Field>
            <Field label="Family">
              {(id) => <Input id={id} value={form.family} onChange={set('family')} placeholder="Solanaceae" />}
            </Field>
          </div>
          <Field label="Description">
            {(id) => <Textarea id={id} rows={2} value={form.description} onChange={set('description')} placeholder="Where it grows, why it matters…" />}
          </Field>
          <Checkbox label="Active (visible to farmers & AI)" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && delMut.mutate(deleting.id)}
        loading={delMut.isPending}
        danger
        title={`Delete "${deleting?.name}"?`}
        confirmLabel="Delete"
        message="If analyses already reference this crop it will be deactivated instead of deleted, preserving history integrity."
      />
    </div>
  );
}
