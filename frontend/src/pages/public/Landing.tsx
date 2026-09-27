// ═══════════════════════════════════════════════════════════════
// VORTEX Landing — immersive 3D hero + 7 information sections.
// 3D chunks are lazily imported; OFF tier gets the CSS identity.
// ═══════════════════════════════════════════════════════════════
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, ButtonLink } from '../../components/ui/Button';
import { GlassCard, SectionHeading, HoloCorners } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { usePerfTier } from '../../hooks/usePerfTier';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { HeroFallback } from '../../components/three/HeroFallback';
import { getCrops, getHealth } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { ROLE_HOME } from '../../lib/constants';
import { WORKFLOW_STAGES } from '../../components/three/workflow/stages';

const HeroScene = lazy(() => import('../../components/three/hero/HeroScene'));
const WorkflowScene = lazy(() => import('../../components/three/workflow/WorkflowScene'));

// ─────────────────────────── Hero ───────────────────────────

function Hero() {
  const tier = usePerfTier();
  const { status, user, homePath } = useAuthStore();

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden" id="hero">
      {/* 3D layer */}
      {tier === 'OFF' ? (
        <HeroFallback />
      ) : (
        <Suspense fallback={<HeroFallback />}>
          <HeroScene tier={tier} />
        </Suspense>
      )}
      {/* vignette for text readability */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_45%_at_50%_42%,rgba(3,7,5,0.55),transparent_75%)]" />

      {/* DOM overlay — always crisp */}
      <div className="relative z-10 text-center px-4 pt-20 pb-16 max-w-4xl mx-auto pointer-events-none">
        <div className="pointer-events-auto">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-8 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
            <span className="text-[11px] font-display font-600 uppercase tracking-[0.22em] text-neon">
              AI · Agriculture · 3D Intelligence
            </span>
          </div>

          <h1
            className="font-display font-700 text-[clamp(3.2rem,11vw,7.5rem)] leading-[0.95] tracking-[0.06em] text-cream animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            VOR<span className="gradient-text text-glow">TEX</span>
          </h1>

          <p
            className="mt-5 text-base md:text-xl font-display font-500 text-cream/90 tracking-wide animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            AI-Powered Crop Disease Guidance System
          </p>

          <p
            className="mt-6 text-sm md:text-lg text-muted italic animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            “Healthy Crops Today, <span className="text-neon not-italic font-500">Better Harvests Tomorrow</span>”
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <ButtonLink to={status === 'authed' && user?.role === 'FARMER' ? '/app/analyze' : '/register'} size="lg" className="w-full sm:w-auto text-base">
              🔬 Analyze My Crop
            </ButtonLink>
            <ButtonLink to="/how-it-works" variant="secondary" size="lg" className="w-full sm:w-auto">
              Explore VORTEX ↓
            </ButtonLink>
          </div>

          {status === 'authed' && (
            <p className="mt-6 text-xs text-muted animate-fade-up" style={{ animationDelay: '0.5s' }}>
              Signed in as {user?.fullName} — <Link className="text-neon hover:underline" to={homePath() || ROLE_HOME[user!.role]}>go to your console →</Link>
            </p>
          )}
        </div>
      </div>

      {/* scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted/70 font-display">Scroll</span>
        <span className="w-px h-10 bg-gradient-to-b from-neon/70 to-transparent animate-pulse" />
      </div>
    </section>
  );
}

// ─────────────────────── The Problem ───────────────────────

const PROBLEM_STATS = [
  { value: '20–40%', label: 'of global crop yield is lost to pests & diseases every year', accent: 'text-danger' },
  { value: '7–10 days', label: 'typical delay before a farmer reaches a human expert — often too late', accent: 'text-amber' },
  { value: '1 : 8000', label: 'rough ratio of extension experts to farmers in many regions', accent: 'text-cyan' },
];

function ProblemSection() {
  return (
    <section className="relative py-24 md:py-32 px-4" id="problem">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="The Problem"
          title={<>When disease strikes, <span className="gradient-text">every hour matters</span></>}
          subtitle="A farmer spots a strange yellow patch on a leaf. Is it a fungus? A virus? Nutrient stress? Wrong guesses mean wrong sprays, wasted money and lost harvests — and expert help is often days away."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {PROBLEM_STATS.map((s, i) => (
            <GlassCard key={i} hover className="text-center relative" data-reveal data-reveal-delay={i * 0.12}>
              <HoloCorners />
              <p className={`text-4xl md:text-5xl font-display font-700 ${s.accent}`}>{s.value}</p>
              <p className="mt-3 text-sm text-muted leading-relaxed">{s.label}</p>
            </GlassCard>
          ))}
        </div>
        <p className="mt-10 text-center text-sm md:text-base text-muted max-w-3xl mx-auto leading-relaxed" data-reveal>
          VORTEX collapses that timeline: a phone photo in the field → an AI-assisted diagnosis in seconds →
          treatment guidance in plain language → <span className="text-neon">human expert validation whenever the AI is unsure</span>.
        </p>
      </div>
    </section>
  );
}

// ──────────────────── How VORTEX Works ────────────────────

const STAGE_DETAILS: { tag: string; title: string; text: string; bullets: string[] }[] = [
  { tag: 'Stage 01', title: 'ASK — the farmer speaks first', text: 'The farmer uploads a photo of the affected leaf and describes what they see, in their own words, from anywhere in the field.', bullets: ['Drag & drop photo upload', 'Crop type + symptom notes', 'Village-level location'] },
  { tag: 'Stage 02', title: 'ANALYZE — VORTEX AI goes to work', text: 'The image is validated, normalised and passed to the AI analysis service, which inspects lesion patterns, discoloration and crop context.', bullets: ['Real image pipeline (sharp)', 'Pluggable AI providers', 'Confidence + severity scoring'] },
  { tag: 'Stage 03', title: 'IDENTIFY — a named diagnosis', text: 'The prediction is matched against a curated disease catalogue for that exact crop — no vague labels, only actionable identities.', bullets: ['Crop-specific disease catalogue', 'Fuzzy label matching', 'Low confidence → expert queue'] },
  { tag: 'Stage 04', title: 'GUIDE — what to do next', text: 'Every diagnosis ships with treatment steps, dosages, organic alternatives and preventive measures — reviewed by experts when needed.', bullets: ['Treatment + prevention plans', 'Expert corrections & comments', 'Safety notes for spraying'] },
  { tag: 'Stage 05', title: 'ACT — the farmer moves', text: 'The farmer acts within the same day: sprays, removes infected plants, or adjusts irrigation — and tracks the outcome in their history.', bullets: ['Same-day action window', 'Full analysis history', 'Notifications at every step'] },
];

function WorkflowSection() {
  const tier = usePerfTier();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((a) => (a + 1) % WORKFLOW_STAGES.length), 5200);
    return () => clearInterval(t);
  }, [auto]);

  const select = (i: number) => {
    setActive(i);
    setAuto(false);
  };

  const detail = STAGE_DETAILS[active];

  return (
    <section className="relative py-24 md:py-32 px-4" id="how-it-works">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="How VORTEX Works"
          title={<>One pipeline, <span className="gradient-text">five intelligent stages</span></>}
          subtitle="Farmer → Crop Image → AI Analysis → Disease Detection → Guidance → Expert Validation → Farmer Action. Click any node to explore."
        />

        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-void/60" style={{ height: 'clamp(340px, 46vw, 480px)' }}>
          {tier === 'OFF' ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 md:gap-4 px-4 bg-aurora">
              {WORKFLOW_STAGES.map((s, i) => (
                <button key={s.key} onClick={() => select(i)} className={`glass flex-1 max-w-[150px] p-3 md:p-5 text-center transition-all ${i === active ? 'border-neon/60 shadow-neon scale-105' : 'opacity-70 hover:opacity-100'}`}>
                  <span className="text-2xl md:text-3xl block">{s.icon}</span>
                  <span className="text-[10px] md:text-xs font-display font-700 tracking-[0.2em] mt-2 block" style={{ color: s.color }}>{s.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <Suspense fallback={<HeroFallback compact />}>
              <WorkflowScene tier={tier} active={active} onSelect={select} />
            </Suspense>
          )}

          {/* Stage info card (DOM glass overlay) */}
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-10">
            <GlassCard className="!p-5 bg-[#04120a]/85">
              <div className="flex items-center justify-between gap-3">
                <Badge color="cyan">{detail.tag}</Badge>
                <button className="text-[11px] text-muted hover:text-neon transition-colors" onClick={() => setAuto((v) => !v)}>
                  {auto ? '⏸ pause tour' : '▶ resume tour'}
                </button>
              </div>
              <h3 className="mt-3 text-lg font-display font-700 text-cream leading-snug">{detail.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{detail.text}</p>
              <ul className="mt-3 space-y-1.5">
                {detail.bullets.map((b) => (
                  <li key={b} className="text-xs text-cream/80 flex items-center gap-2">
                    <span className="text-neon">▸</span> {b}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>

        {/* stage dots (mobile-friendly nav) */}
        <div className="mt-5 flex justify-center gap-2">
          {WORKFLOW_STAGES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => select(i)}
              aria-label={`Stage ${i + 1}: ${s.title}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? 'w-10 bg-neon shadow-neon' : 'w-2 bg-white/15 hover:bg-white/30'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────── Why VORTEX ────────────────────

const WHY = [
  { icon: '⚡', title: 'Seconds, not weeks', text: 'From photo to actionable guidance in seconds — while the disease is still containable.' },
  { icon: '🎯', title: 'Crop-specific intelligence', text: 'A curated catalogue of real diseases per crop — the AI never guesses outside the agronomy it knows.' },
  { icon: '🧑‍🔬', title: 'Humans in the loop', text: 'Low-confidence cases are automatically routed to qualified plant pathologists for validation.' },
  { icon: '🔒', title: 'Honest AI labelling', text: 'Every result shows its provider and confidence. Simulated dev results are always visibly flagged.' },
  { icon: '📍', title: 'Built for Bharat', text: 'Tamil Nadu crops first — rice, tomato, cotton, coconut, banana — with village-level context.' },
  { icon: '🗂', title: 'Complete field history', text: 'Every analysis, review and guidance step is stored — build a memory of your farm over seasons.' },
];

function WhySection() {
  return (
    <section className="relative py-24 md:py-32 px-4" id="why">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Why VORTEX"
          title={<>Technology that <span className="gradient-text">earns a farmer's trust</span></>}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHY.map((w, i) => (
            <GlassCard key={w.title} hover data-reveal data-reveal-delay={(i % 3) * 0.1}>
              <div className="w-12 h-12 rounded-2xl glass neon-border flex items-center justify-center text-2xl mb-4 animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
                {w.icon}
              </div>
              <h3 className="font-display font-700 text-cream text-lg">{w.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{w.text}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────── Who Is Involved ────────────────────

const ROLES = [
  { icon: '👨‍🌾', role: 'FARMER', color: '#39ff88', title: 'The Farmer', text: 'Uploads crop photos, describes symptoms, receives diagnosis + guidance, requests expert review, tracks history.', actions: ['Upload & analyze', 'View guidance', 'Request expert review'] },
  { icon: '🤖', role: 'VORTEX AI', color: '#22d3ee', title: 'VORTEX AI', text: 'The AI analysis service — inspects every image, predicts the disease, scores confidence and severity, drafts guidance.', actions: ['Vision analysis', 'Confidence scoring', 'Disease matching'] },
  { icon: '🧑‍🔬', role: 'EXPERT', color: '#a855f7', title: 'The Expert', text: 'Plant pathologists who validate uncertain cases, correct diagnoses and author final treatment plans.', actions: ['Claim cases', 'Approve or correct AI', 'Author guidance'] },
  { icon: '🛡️', role: 'ADMIN', color: '#ffb020', title: 'The Admin', text: 'Runs the platform — approves experts, curates the crop & disease catalogue, monitors every analysis.', actions: ['Approve experts', 'Manage catalogue', 'Monitor platform'] },
];

function RolesSection() {
  return (
    <section className="relative py-24 md:py-32 px-4" id="roles">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Who Is Involved"
          title={<>Four roles, <span className="gradient-text">one harvest-saving loop</span></>}
          subtitle="Farmer → Crop Image → AI Analysis → Disease Detection → Guidance → Expert Validation → Farmer Action"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r, i) => (
            <GlassCard key={r.role} hover className="relative overflow-hidden" data-reveal data-reveal-delay={i * 0.1}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: r.color }} />
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-3xl mb-4 border" style={{ borderColor: `${r.color}44` }}>
                {r.icon}
              </div>
              <p className="text-[10px] font-display font-700 tracking-[0.25em]" style={{ color: r.color }}>{r.role}</p>
              <h3 className="font-display font-700 text-cream text-lg mt-1">{r.title}</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">{r.text}</p>
              <ul className="mt-4 space-y-1.5">
                {r.actions.map((a) => (
                  <li key={a} className="text-[11px] text-cream/75 flex items-center gap-2">
                    <span style={{ color: r.color }}>◆</span> {a}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────── VORTEX Journey ────────────────────

const JOURNEY = [
  { step: '01', title: 'Farmer notices a symptom', text: 'A yellow patch, a curled leaf, brown spots — the farmer opens VORTEX on any phone.', icon: '🍃' },
  { step: '02', title: 'Photo + context captured', text: 'One clear photo, the crop type, symptoms in their own words and their village location.', icon: '📸' },
  { step: '03', title: 'AI analysis runs in seconds', text: 'The image is validated and analyzed; the result carries a confidence score and severity.', icon: '🧠' },
  { step: '04', title: 'Expert validates when needed', text: 'Anything uncertain is queued for a plant pathologist who approves, corrects and advises.', icon: '🧑‍🔬' },
  { step: '05', title: 'Farmer acts with confidence', text: 'Treatment steps, dosages, safety notes and prevention — the field gets a same-day response.', icon: '🌾' },
];

function JourneySection() {
  return (
    <section className="relative py-24 md:py-32 px-4" id="journey">
      <div className="max-w-4xl mx-auto">
        <SectionHeading eyebrow="VORTEX Journey" title={<>From a worried glance to a <span className="gradient-text">saved harvest</span></>} />
        <div className="relative">
          {/* spine */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-neon/60 via-cyan/40 to-transparent md:-translate-x-px" aria-hidden />
          <div className="space-y-10">
            {JOURNEY.map((j, i) => (
              <div
                key={j.step}
                data-reveal
                className={`relative flex items-start gap-5 md:gap-0 ${i % 2 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* node */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full glass neon-border flex items-center justify-center text-xl z-10 animate-pulse-glow" style={{ animationDelay: `${i * 0.35}s` }}>
                  {j.icon}
                </div>
                <div className={`ml-16 md:ml-0 md:w-1/2 ${i % 2 ? 'md:pr-14 md:text-left' : 'md:pl-14'}`}>
                  <GlassCard hover className="!p-5">
                    <p className="text-[11px] font-mono text-neon tracking-widest">STEP {j.step}</p>
                    <h3 className="font-display font-700 text-cream text-base mt-1">{j.title}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{j.text}</p>
                  </GlassCard>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────── Live catalogue strip + CTA ────────────────────

function CatalogueStrip() {
  const { data: crops } = useQuery({ queryKey: ['crops'], queryFn: getCrops, staleTime: 120_000 });
  if (!crops || crops.length === 0) return null;
  return (
    <section className="py-10 px-4 overflow-hidden" aria-label="Supported crops">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-muted font-display mb-6">
          Live catalogue — {crops.length} crops · {crops.reduce((a, c) => a + (c.diseaseCount ?? 0), 0)} diseases tracked
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {crops.map((c) => (
            <span key={c.id} className="glass px-3.5 py-2 rounded-full text-xs text-cream/85 flex items-center gap-2 hover:border-neon/40 hover:text-neon transition-colors">
              <span aria-hidden>{c.emoji}</span> {c.name}
              <span className="text-muted/60 font-mono text-[10px]">{c.diseaseCount ?? 0} diseases</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 });
  return (
    <section className="py-24 px-4" id="cta">
      <div className="max-w-4xl mx-auto relative" data-reveal>
        <GlassCard className="relative overflow-hidden !p-10 md:!p-16 text-center border-neon/25">
          <HoloCorners />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_120%,rgba(57,255,136,0.12),transparent)]" aria-hidden />
          <div className="relative">
            <p className="text-4xl mb-5 animate-float inline-block">🌱</p>
            <h2 className="text-3xl md:text-5xl font-display font-700 text-cream leading-tight">
              Your crop won't wait. <span className="gradient-text">Neither should you.</span>
            </h2>
            <p className="mt-5 text-muted max-w-xl mx-auto leading-relaxed">
              Join VORTEX today — upload one photo and get an AI-assisted diagnosis with expert-backed guidance,
              in the time it takes to walk across your field.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center">
              <ButtonLink to="/register" size="lg">Create free farmer account</ButtonLink>
              <ButtonLink to="/how-it-works" variant="secondary" size="lg">See how it works</ButtonLink>
            </div>
            {health && (
              <p className="mt-8 text-[11px] font-mono text-muted/60">
                system: {health.status} · database: {health.database} · ai: {health.ai.provider}
                {health.ai.isMock ? ' (simulated — dev fallback, no API key configured)' : ' (live)'}
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

// ──────────────────── Page ────────────────────

export default function Landing() {
  const ref = useGsapReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <Hero />
      <ProblemSection />
      <WorkflowSection />
      <CatalogueStrip />
      <WhySection />
      <RolesSection />
      <JourneySection />
      <CTASection />
    </div>
  );
}
