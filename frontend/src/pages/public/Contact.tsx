import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { GlassCard, SectionHeading, HoloCorners } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { toast } from '../../store/toastStore';
import { sendContact } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { useGsapReveal } from '../../hooks/useGsapReveal';

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

const CHANNELS = [
  { icon: '📍', title: 'Field Office', text: 'TNAU Campus Road, Coimbatore, Tamil Nadu 641003' },
  { icon: '📞', title: 'Kisan Helpline', text: '+91 422 000 0000 · Mon–Sat, 7 AM – 8 PM IST' },
  { icon: '✉️', title: 'Email', text: 'help@vortex.app · experts@vortex.app' },
];

export default function Contact() {
  const ref = useGsapReveal<HTMLDivElement>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>();

  const onSubmit = async (data: ContactForm) => {
    setSubmitting(true);
    try {
      const res = await sendContact(data);
      toast.success('Message sent', res.message);
      setSent(true);
      reset();
    } catch (e) {
      toast.error('Could not send message', e instanceof ApiClientError ? e.message : 'Please try again later');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={ref} className="pt-32 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="Contact"
          title={<>Talk to the <span className="gradient-text">VORTEX team</span></>}
          subtitle="Questions about the platform, expert onboarding, or partnering with an FPO? Every message lands directly in the admin console."
        />

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {CHANNELS.map((c, i) => (
              <GlassCard key={c.title} hover data-reveal data-reveal-delay={i * 0.08}>
                <div className="flex gap-4">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <h3 className="font-display font-700 text-cream text-sm">{c.title}</h3>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{c.text}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
            <GlassCard className="relative overflow-hidden" data-reveal>
              <HoloCorners />
              <p className="text-xs font-display font-600 uppercase tracking-[0.2em] text-neon mb-2">Response time</p>
              <p className="text-sm text-muted leading-relaxed">
                Messages are stored in the platform activity log and pushed as notifications to every admin — typically answered within one working day.
              </p>
            </GlassCard>
          </div>

          <div className="lg:col-span-3">
            <GlassCard className="relative !p-8" data-reveal>
              <HoloCorners />
              {sent ? (
                <div className="text-center py-10 animate-fade-up">
                  <div className="text-5xl mb-4 inline-block animate-float">📨</div>
                  <h3 className="text-xl font-display font-700 text-neon">Message delivered</h3>
                  <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
                    The VORTEX team has your message — check your inbox for a reply soon.
                  </p>
                  <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <h3 className="font-display font-700 text-cream text-lg">Send us a message</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Your name" error={errors.name?.message} required>
                      {(id) => (
                        <Input id={id} placeholder="Ravi Kumar" invalid={Boolean(errors.name)}
                          {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} />
                      )}
                    </Field>
                    <Field label="Email" error={errors.email?.message} required>
                      {(id) => (
                        <Input id={id} type="email" placeholder="you@example.com" invalid={Boolean(errors.email)}
                          {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
                      )}
                    </Field>
                  </div>
                  <Field label="Message" error={errors.message?.message} required hint="Min 10 characters">
                    {(id) => (
                      <Textarea id={id} rows={6} placeholder="Tell us how we can help…" invalid={Boolean(errors.message)}
                        {...register('message', { required: 'Message is required', minLength: { value: 10, message: 'Please write at least 10 characters' }, maxLength: { value: 2000, message: 'Max 2000 characters' } })} />
                    )}
                  </Field>
                  <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto">
                    🚀 Send message
                  </Button>
                </form>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
