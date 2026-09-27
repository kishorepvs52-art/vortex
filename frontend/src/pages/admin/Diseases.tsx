// Admin — disease catalogue CRUD, filterable by crop.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCreateDisease, adminDeleteDisease, adminDiseases, adminUpdateDisease, getCrops } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea, Checkbox } from '../../components/ui/Input';
import { Badge, PathogenBadge, SeverityBadge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import type { PathogenType, Severity } from '../../types/api';

interface DiseaseRow {
  id: string;
  cropTypeId: string;
  name: string;
  pathogenType: PathogenType;
  description: string;
  symptoms: string;
  visibleSigns: string | null;
  defaultSeverity: Severity;
  treatmentSummary: string;
  preventiveSummary: string;
  isCommon: boolean;
  isActive: boolean;
  cropType?: { id: string; name: string; emoji: string | null };
}

const emptyForm = {
  cropTypeId: '', name: '', pathogenType: 'FUNGAL' as PathogenType, description: '', symptoms: '',
  visibleSigns: '', defaultSeverity: 'MODERATE' as Severity, treatmentSummary: '', preventiveSummary: '',
  isCommon: false, isActive: true,
};

export default function AdminDiseases() {
  const qc = useQueryClient();
  const [cropFilter, setCropFilter] = useState('');
  const { data: crops } = useQuery({ queryKey: ['crops'], queryFn: getCrops });
  const { data: diseases, isLoading } = useQuery({
    queryKey: ['admin-diseases', cropFilter],
    queryFn: () => adminDiseases(cropFilter || undefined) as Promise<DiseaseRow[]>,
  });

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; row?: DiseaseRow } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<DiseaseRow | null>(null);

  const openCreate = () => { setForm({ ...emptyForm, cropTypeId: cropFilter }); setModal({ mode: 'create' }); };
  const openEdit = (row: DiseaseRow) => {
    setForm({
      cropTypeId: row.cropTypeId, name: row.name, pathogenType: row.pathogenType,
      description: row.description, symptoms: row.symptoms, visibleSigns: row.visibleSigns ?? '',
      defaultSeverity: row.defaultSeverity, treatmentSummary: row.treatmentSummary,
      preventiveSummary: row.preventiveSummary, isCommon: row.isCommon, isActive: row.isActive,
    });
    setModal({ mode: 'edit', row });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        pathogenType: form.pathogenType,
        description: form.description.trim(),
        symptoms: form.symptoms.trim(),
        visibleSigns: form.visibleSigns.trim() || null,
        defaultSeverity: form.defaultSeverity,
        treatmentSummary: form.treatmentSummary.trim(),
        preventiveSummary: form.preventiveSummary.trim(),
        isCommon: form.isCommon,
        isActive: form.isActive,
      };
      if (modal?.mode === 'edit' && modal.row) return adminUpdateDisease(modal.row.id, payload);
      return adminCreateDisease({ ...payload, cropTypeId: form.cropTypeId });
    },
    onSuccess: () => {
      toast.success(modal?.mode === 'edit' ? 'Disease updated' : 'Disease added to catalogue');
      qc.invalidateQueries({ queryKey: ['admin-diseases'] });
      qc.invalidateQueries({ queryKey: ['crops'] });
      setModal(null);
    },
    onError: (e) => toast.error('Save failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminDeleteDisease(id),
    onSuccess: () => {
      toast.info('Disease removed/deactivated');
      qc.invalidateQueries({ queryKey: ['admin-diseases'] });
      setDeleting(null);
    },
    onError: (e) => toast.error('Delete failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const columns: Column<DiseaseRow>[] = [
    {
      key: 'disease',
      header: 'Disease',
      render: (d) => (
        <div>
          <p className="font-display font-600 text-cream text-sm">{d.name}</p>
          <p className="text-[11px] text-muted/70">{d.cropType?.emoji} {d.cropType?.name}</p>
        </div>
      ),
    },
    { key: 'pathogen', header: 'Pathogen', render: (d) => <PathogenBadge type={d.pathogenType} /> },
    { key: 'severity', header: 'Default severity', hideBelow: 'md', render: (d) => <SeverityBadge severity={d.defaultSeverity} /> },
    {
      key: 'flags',
      header: 'Flags',
      hideBelow: 'lg',
      render: (d) => (
        <div className="flex gap-1.5">
          {d.isCommon && <Badge color="amber">common</Badge>}
          {!d.isActive && <Badge color="grey">hidden</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(d); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleting(d); }}>Delete</Button>
        </div>
      ),
    },
  ];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const formValid =
    form.name.trim().length >= 2 && form.cropTypeId && form.description.trim().length >= 10 &&
    form.symptoms.trim().length >= 10 && form.treatmentSummary.trim().length >= 10 && form.preventiveSummary.trim().length >= 10;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🦠 Disease catalogue</h1>
          <p className="text-sm text-muted mt-1">Curated agronomy the AI is allowed to predict — per crop, with treatment & prevention.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select className="!w-auto min-w-[160px]" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
            <option value="">All crops</option>
            {crops?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </Select>
          <Button onClick={openCreate}>+ Add disease</Button>
        </div>
      </div>

      <DataTable columns={columns} rows={diseases} loading={isLoading} emptyMessage="No diseases for this filter yet." />

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        wide
        title={modal?.mode === 'edit' ? `Edit — ${modal.row?.name}` : 'Add disease'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button loading={saveMut.isPending} disabled={!formValid} onClick={() => saveMut.mutate()}>
              {modal?.mode === 'edit' ? 'Save changes' : 'Add disease'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Crop" required>
              {(id) => (
                <Select id={id} value={form.cropTypeId} onChange={set('cropTypeId')} disabled={modal?.mode === 'edit'}>
                  <option value="">Select…</option>
                  {crops?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Disease name" required>
              {(id) => <Input id={id} value={form.name} onChange={set('name')} placeholder="e.g. Sheath Blight" />}
            </Field>
            <Field label="Pathogen type">
              {(id) => (
                <Select id={id} value={form.pathogenType} onChange={set('pathogenType')}>
                  {(['FUNGAL', 'BACTERIAL', 'VIRAL', 'NUTRITIONAL', 'PEST', 'PHYSIOLOGICAL', 'HEALTHY', 'UNKNOWN'] as const).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Description" required>
            {(id) => <Textarea id={id} rows={2} value={form.description} onChange={set('description')} placeholder="What causes it, when it strikes…" />}
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Symptoms (farmer language)" required>
              {(id) => <Textarea id={id} rows={2} value={form.symptoms} onChange={set('symptoms')} />}
            </Field>
            <Field label="Visible signs (diagnostic)">
              {(id) => <Textarea id={id} rows={2} value={form.visibleSigns} onChange={set('visibleSigns')} />}
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Treatment summary (one step per line)" required>
              {(id) => <Textarea id={id} rows={3} value={form.treatmentSummary} onChange={set('treatmentSummary')} placeholder={'Spray X @ n g/L.\nRepeat after 10 days.'} />}
            </Field>
            <Field label="Preventive summary (one per line)" required>
              {(id) => <Textarea id={id} rows={3} value={form.preventiveSummary} onChange={set('preventiveSummary')} />}
            </Field>
          </div>
          <div className="flex gap-6 flex-wrap">
            <Field label="Default severity">
              {(id) => (
                <Select id={id} value={form.defaultSeverity} onChange={set('defaultSeverity')}>
                  {(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              )}
            </Field>
            <div className="flex items-end gap-5 pb-1">
              <Checkbox label="Common disease" checked={form.isCommon} onChange={(e) => setForm((f) => ({ ...f, isCommon: e.target.checked }))} />
              <Checkbox label="Active" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            </div>
          </div>
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
        message="Diseases referenced by past AI results are deactivated instead of deleted, keeping historical analyses intact."
      />
    </div>
  );
}
