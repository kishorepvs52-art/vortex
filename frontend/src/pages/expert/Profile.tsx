// Expert profile — credentials + password management.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePassword, updateProfile } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { Panel } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { fmtDateTime, initials } from '../../lib/format';

export default function ExpertProfile() {
  const { user, setUser } = useAuthStore();
  const ep = user?.expertProfile;

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    specialization: ep?.specialization ?? '',
    qualification: ep?.qualification ?? '',
    licenseNumber: ep?.licenseNumber ?? '',
    yearsExperience: ep?.yearsExperience?.toString() ?? '',
    bio: ep?.bio ?? '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const profileMut = useMutation({
    mutationFn: () =>
      updateProfile({
        fullName: form.fullName,
        phone: form.phone || null,
        specialization: form.specialization || undefined,
        qualification: form.qualification || null,
        licenseNumber: form.licenseNumber || null,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
        bio: form.bio || null,
      }),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error('Update failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const pwMut = useMutation({
    mutationFn: () => changePassword(pwForm.currentPassword, pwForm.newPassword),
    onSuccess: () => {
      toast.success('Password changed', 'All other sessions were signed out.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e) => toast.error('Password change failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const pwValid =
    pwForm.currentPassword.length > 0 &&
    pwForm.newPassword.length >= 8 &&
    /[a-zA-Z]/.test(pwForm.newPassword) &&
    /[0-9]/.test(pwForm.newPassword) &&
    pwForm.newPassword === pwForm.confirmPassword;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">👤 Expert profile</h1>
        <p className="text-sm text-muted mt-1">Your credentials are shown to farmers on every review you complete.</p>
      </div>

      <Panel className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet to-cyan-dim flex items-center justify-center text-xl font-bold text-void shrink-0">
          {initials(user?.fullName ?? '?')}
        </div>
        <div className="min-w-0">
          <p className="font-display font-700 text-cream text-lg truncate">{user?.fullName}</p>
          <p className="text-xs text-muted font-mono truncate">{user?.email}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge color="violet">EXPERT</Badge>
            {ep?.specialization && <Badge color="cyan">{ep.specialization}</Badge>}
            <Badge color="grey">Since {fmtDateTime(user?.createdAt)}</Badge>
          </div>
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display font-700 text-cream mb-5">Credentials</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            {(id) => <Input id={id} value={form.fullName} onChange={set('fullName')} />}
          </Field>
          <Field label="Phone">
            {(id) => <Input id={id} value={form.phone} onChange={set('phone')} />}
          </Field>
          <Field label="Specialization" required>
            {(id) => <Input id={id} value={form.specialization} onChange={set('specialization')} />}
          </Field>
          <Field label="Qualification">
            {(id) => <Input id={id} value={form.qualification} onChange={set('qualification')} placeholder="Ph.D. Plant Pathology" />}
          </Field>
          <Field label="License number">
            {(id) => <Input id={id} value={form.licenseNumber} onChange={set('licenseNumber')} />}
          </Field>
          <Field label="Years of experience">
            {(id) => <Input id={id} type="number" min={0} max={70} value={form.yearsExperience} onChange={set('yearsExperience')} />}
          </Field>
          <Field label="Bio" className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={3} value={form.bio} onChange={set('bio')} />}
          </Field>
        </div>
        <Button className="mt-6" onClick={() => profileMut.mutate()} loading={profileMut.isPending} disabled={!form.fullName.trim() || !form.specialization.trim()}>
          💾 Save profile
        </Button>
      </Panel>

      <Panel>
        <h2 className="font-display font-700 text-cream mb-5">Change password</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Current password" required>
            {(id) => <Input id={id} type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} />}
          </Field>
          <Field label="New password" required hint="8+ chars, letter + number">
            {(id) => <Input id={id} type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} />}
          </Field>
          <Field label="Confirm" required error={pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'Mismatch' : undefined}>
            {(id) => <Input id={id} type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} />}
          </Field>
        </div>
        <Button className="mt-6" variant="secondary" disabled={!pwValid} loading={pwMut.isPending} onClick={() => pwMut.mutate()}>
          🔑 Update password
        </Button>
      </Panel>
    </div>
  );
}
