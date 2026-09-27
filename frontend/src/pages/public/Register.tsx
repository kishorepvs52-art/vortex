import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Logo } from '../../components/layout/Logo';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Input';
import { GlassCard, HoloCorners } from '../../components/ui/Card';
import { cn } from '../../lib/cn';
import { toast } from '../../store/toastStore';
import { registerAction } from '../../store/authStore';
import { ApiClientError } from '../../api/client';
import { ROLE_HOME } from '../../lib/constants';
import { HeroFallback } from '../../components/three/HeroFallback';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  role: 'FARMER' | 'EXPERT';
  village?: string;
  district?: string;
  state?: string;
  farmSizeAcres?: string;
  specialization?: string;
  qualification?: string;
  yearsExperience?: string;
  bio?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'FARMER' | 'EXPERT'>('FARMER');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: 'FARMER', state: 'Tamil Nadu' },
  });
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await registerAction({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        role: data.role,
        village: data.village || undefined,
        district: data.district || undefined,
        state: data.state || undefined,
        farmSizeAcres: data.farmSizeAcres ? Number(data.farmSizeAcres) : undefined,
        specialization: data.specialization || undefined,
        qualification: data.qualification || undefined,
        yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : undefined,
        bio: data.bio || undefined,
      });
      if (res.pendingApproval) {
        setPendingApproval(true);
        toast.info('Registration received', 'An admin will approve your expert account shortly.');
      } else {
        toast.success(`Welcome to VORTEX, ${res.user.fullName.split(' ')[0]}! 🌱`);
        navigate(ROLE_HOME[res.user.role] ?? '/', { replace: true });
      }
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.message : 'Registration failed — please try again';
      setServerError(msg);
      toast.error('Registration failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-16">
        <HeroFallback compact />
        <div className="relative z-10 w-full max-w-md">
          <GlassCard className="!p-10 text-center relative">
            <HoloCorners />
            <div className="text-5xl mb-5 animate-float inline-block">🧑‍🔬</div>
            <h1 className="text-2xl font-display font-700 text-cream">Expert registration received</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Thank you for joining VORTEX as a plant pathology expert. Your account is{' '}
              <span className="text-amber font-600">awaiting admin approval</span>. You'll be able to sign in
              and start reviewing cases as soon as you're approved.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Link to="/login" className="w-full">
                <Button variant="secondary" className="w-full">Back to sign in</Button>
              </Link>
              <Link to="/" className="text-xs text-muted hover:text-neon transition-colors">← Return to landing</Link>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16">
      <HeroFallback compact />
      <div className="absolute top-5 left-5 z-10">
        <Logo />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <GlassCard className="relative !p-8">
          <HoloCorners />
          <h1 className="text-2xl font-display font-700 text-cream">Join VORTEX</h1>
          <p className="text-sm text-muted mt-1.5">Healthy Crops Today, Better Harvests Tomorrow.</p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(['FARMER', 'EXPERT'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'glass p-4 rounded-2xl text-left transition-all duration-200 border',
                  role === r ? 'border-neon/60 shadow-neon bg-neon/[0.07]' : 'hover:border-white/25',
                )}
              >
                <span className="text-2xl">{r === 'FARMER' ? '👨‍🌾' : '🧑‍🔬'}</span>
                <span className={cn('block mt-2 font-display font-700 text-sm', role === r ? 'text-neon' : 'text-cream')}>
                  I'm a {r === 'FARMER' ? 'Farmer' : 'Crop Expert'}
                </span>
                <span className="block text-[11px] text-muted mt-1 leading-snug">
                  {r === 'FARMER' ? 'Analyze crops & get guidance' : 'Review cases & validate AI (needs approval)'}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={errors.fullName?.message} required>
                {(id) => (
                  <Input id={id} placeholder="Ravi Kumar" invalid={Boolean(errors.fullName)}
                    {...register('fullName', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} />
                )}
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                {(id) => (
                  <Input id={id} placeholder="+91 98765 43210" invalid={Boolean(errors.phone)}
                    {...register('phone', { pattern: { value: /^[0-9+\-\s()]{7,20}$/, message: 'Enter a valid phone number' } })} />
                )}
              </Field>
            </div>

            <Field label="Email" error={errors.email?.message} required>
              {(id) => (
                <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" invalid={Boolean(errors.email)}
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
              )}
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Password" error={errors.password?.message} required hint="Min 8 chars, letter + number">
                {(id) => (
                  <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" invalid={Boolean(errors.password)}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                      validate: (v) => (/[a-zA-Z]/.test(v) && /[0-9]/.test(v)) || 'Must contain a letter and a number',
                    })} />
                )}
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword?.message} required>
                {(id) => (
                  <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" invalid={Boolean(errors.confirmPassword)}
                    {...register('confirmPassword', {
                      required: 'Please confirm the password',
                      validate: (v) => v === password || 'Passwords do not match',
                    })} />
                )}
              </Field>
            </div>

            <input type="hidden" value={role} {...register('role')} />

            {role === 'FARMER' ? (
              <div className="glass !rounded-2xl p-4 space-y-4 border-neon/15">
                <p className="text-xs font-display font-600 uppercase tracking-[0.15em] text-neon">🌾 Farm location (optional)</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Village / Town">
                    {(id) => <Input id={id} placeholder="Sulur" {...register('village')} />}
                  </Field>
                  <Field label="District">
                    {(id) => <Input id={id} placeholder="Coimbatore" {...register('district')} />}
                  </Field>
                  <Field label="State">
                    {(id) => <Input id={id} placeholder="Tamil Nadu" {...register('state')} />}
                  </Field>
                </div>
                <Field label="Farm size (acres)">
                  {(id) => <Input id={id} type="number" min="0" step="0.1" placeholder="4.5" {...register('farmSizeAcres')} />}
                </Field>
              </div>
            ) : (
              <div className="glass !rounded-2xl p-4 space-y-4 border-violet/20">
                <p className="text-xs font-display font-600 uppercase tracking-[0.15em] text-violet">🧑‍🔬 Expert credentials</p>
                <Field label="Specialization" error={errors.specialization?.message} required>
                  {(id) => (
                    <Select id={id} invalid={Boolean(errors.specialization)}
                      {...register('specialization', { required: 'Specialization is required for experts' })}>
                      <option value="">Select specialization…</option>
                      <option>Plant Pathology</option>
                      <option>Entomology</option>
                      <option>Mycology</option>
                      <option>Virology</option>
                      <option>Agronomy</option>
                      <option>Horticulture</option>
                    </Select>
                  )}
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Qualification">
                    {(id) => <Input id={id} placeholder="Ph.D. Plant Pathology" {...register('qualification')} />}
                  </Field>
                  <Field label="Years of experience">
                    {(id) => <Input id={id} type="number" min="0" max="70" placeholder="10" {...register('yearsExperience')} />}
                  </Field>
                </div>
                <Field label="Short bio">
                  {(id) => <Textarea id={id} rows={2} placeholder="Your field diagnostic experience…" {...register('bio')} />}
                </Field>
                <p className="text-[11px] text-amber/90 leading-relaxed">
                  ⚠ Expert accounts are activated by a VORTEX admin after credential verification.
                </p>
              </div>
            )}

            {serverError && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{serverError}</div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {role === 'FARMER' ? '🌱 Create farmer account' : '🧑‍🔬 Submit expert registration'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already registered?{' '}
            <Link to="/login" className="text-neon font-600 hover:underline underline-offset-4">Sign in</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
