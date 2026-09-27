import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Logo } from '../../components/layout/Logo';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Input';
import { GlassCard, HoloCorners } from '../../components/ui/Card';
import { toast } from '../../store/toastStore';
import { loginAction, useAuthStore } from '../../store/authStore';
import { ApiClientError } from '../../api/client';
import { DEMO_ACCOUNTS, ROLE_HOME } from '../../lib/constants';
import { HeroFallback } from '../../components/three/HeroFallback';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const user = await loginAction(data);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.message : 'Sign in failed — please try again';
      setServerError(msg);
      toast.error('Sign in failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    setServerError(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-16">
      <HeroFallback compact />
      <div className="absolute top-5 left-5 z-10">
        <Logo />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <GlassCard className="relative !p-8">
          <HoloCorners />
          <h1 className="text-2xl font-display font-700 text-cream">Sign in to VORTEX</h1>
          <p className="text-sm text-muted mt-1.5">Your fields, your analyses, your harvest — secured.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            <Field label="Email" error={errors.email?.message} required>
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  placeholder="you@farm.app"
                  invalid={Boolean(errors.email)}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                  })}
                />
              )}
            </Field>
            <Field label="Password" error={errors.password?.message} required>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  invalid={Boolean(errors.password)}
                  {...register('password', { required: 'Password is required' })}
                />
              )}
            </Field>

            {serverError && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign in →
            </Button>
          </form>

          <div className="mt-7 pt-6 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted font-display mb-3">Demo accounts (development)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fillDemo(d.email, d.password)}
                  className="glass px-2 py-2.5 rounded-xl text-center hover:border-neon/40 transition-colors group"
                  title={`${d.email} / ${d.password}\n${d.desc}`}
                >
                  <span className="block text-lg">{d.role === 'Farmer' ? '👨‍🌾' : d.role === 'Expert' ? '🧑‍🔬' : '🛡️'}</span>
                  <span className="block text-[10px] font-display font-600 text-muted group-hover:text-neon mt-1">{d.role}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted/50 mt-2 font-mono">Click a role to autofill · passwords in README</p>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            New to VORTEX?{' '}
            <Link to="/register" className="text-neon font-600 hover:underline underline-offset-4">Create an account</Link>
          </p>
        </GlassCard>

        {useAuthStore.getState().status === 'anon' && (
          <p className="text-center text-[11px] text-muted/50 mt-4">
            <Link to="/" className="hover:text-neon">← Back to vortex.app landing</Link>
          </p>
        )}
      </div>
    </div>
  );
}
