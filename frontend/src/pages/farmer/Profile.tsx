// Farmer profile — edit personal + farm details, change password.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../store/toastStore';
import { changePassword, updateProfile } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { fmtDateTime, initials } from '../../lib/format';

export default function FarmerProfile() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const fp = user?.farmerProfile;

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    village: fp?.village ?? '',
    district: fp?.district ?? '',
    state: fp?.state ?? '',
    farmSizeAcres: fp?.farmSizeAcres?.toString() ?? '',
    preferredLanguage: fp?.preferredLanguage ?? 'en',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const profileMut = useMutation({
    mutationFn: () =>
      updateProfile({
        fullName: form.fullName,
        phone: form.phone || null,
        village: form.village || null,
        district: form.district || null,
        state: form.state || null,
        farmSizeAcres: form.farmSizeAcres ? Number(form.farmSizeAcres) : null,
        preferredLanguage: form.preferredLanguage,
      }),
    onSuccess: (updated) => {
      setUser(updated);
      qc.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Profile updated', 'Your farm details are saved.');
    },
    onError: (e) => toast.error('Update failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const pwMut = useMutation({
    mutationFn: () => changePassword(pwForm.currentPassword, pwForm.newPassword),
    onSuccess: () => {
      toast.success('Password changed', 'All other sessions were signed out for security.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e) => toast.error('Password change failed', e instanceof ApiClientError ? e.message : undefined),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pwValid =
    pwForm.newPassword.length >= 8 &&
    /[a-zA-Z]/.test(pwForm.newPassword) &&
    /[0-9]/.test(pwForm.newPassword) &&
    pwForm.newPassword === pwForm.confirmPassword &&
    pwForm.currentPassword.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">👤 My profile</h1>
        <p className="text-sm text-muted mt-1">Your identity and farm details across VORTEX.</p>
      </div>

      {/* Identity card */}
      <Panel className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-dim to-cyan-dim flex items-center justify-center text-xl font-bold text-void shrink-0">
          {initials(user?.fullName ?? '?')}
        </div>
        <div className="min-w-0">
          <p className="font-display font-700 text-cream text-lg truncate">{user?.fullName}</p>
          <p className="text-xs text-muted font-mono truncate">{user?.email}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge color="green">FARMER</Badge>
            <Badge color="grey">Member since {fmtDateTime(user?.createdAt)}</Badge>
          </div>
        </div>
      </Panel>

      {/* Profile form */}
      <Panel>
        <h2 className="font-display font-700 text-cream mb-5">Personal & farm details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            {(id) => <Input id={id} value={form.fullName} onChange={set('fullName')} />}
          </Field>
          <Field label="Phone">
            {(id) => <Input id={id} value={form.phone} onChange={set('phone')} placeholder="+91 …" />}
          </Field>
          <Field label="Village / Town">
            {(id) => <Input id={id} value={form.village} onChange={set('village')} placeholder="Sulur" />}
          </Field>
          <Field label="District">
            {(id) => <Input id={id} value={form.district} onChange={set('district')} placeholder="Coimbatore" />}
          </Field>
          <Field label="State">
            {(id) => <Input id={id} value={form.state} onChange={set('state')} placeholder="Tamil Nadu" />}
          </Field>
          <Field label="Farm size (acres)">
            {(id) => <Input id={id} type="number" min="0" step="0.1" value={form.farmSizeAcres} onChange={set('farmSizeAcres')} />}
          </Field>
          <Field label="Preferred language">
            {(id) => (
              <Select id={id} value={form.preferredLanguage} onChange={set('preferredLanguage')}>
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </Select>
            )}
          </Field>
        </div>
        <Button className="mt-6" onClick={() => profileMut.mutate()} loading={profileMut.isPending} disabled={!form.fullName.trim()}>
          💾 Save profile
        </Button>
      </Panel>

      {/* Password */}
      <Panel>
        <h2 className="font-display font-700 text-cream mb-5">Change password</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Current password" required>
            {(id) => <Input id={id} type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" />}
          </Field>
          <Field label="New password" required hint="8+ chars, letter + number">
            {(id) => <Input id={id} type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} autoComplete="new-password" />}
          </Field>
          <Field
            label="Confirm new password"
            required
            error={pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'Passwords do not match' : undefined}
          >
            {(id) => <Input id={id} type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" />}
          </Field>
        </div>
        <Button className="mt-6" variant="secondary" disabled={!pwValid} loading={pwMut.isPending} onClick={() => pwMut.mutate()}>
          🔑 Update password
        </Button>
        <p className="text-[11px] text-muted/60 mt-3">Changing your password signs out all other sessions immediately.</p>
      </Panel>
    </div>
  );
}
