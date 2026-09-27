import { GlassCard, SectionHeading, HoloCorners } from '../../components/ui/Card';
import { ButtonLink } from '../../components/ui/Button';
import { useGsapReveal } from '../../hooks/useGsapReveal';

const VALUES = [
  { icon: '🌍', title: 'Farmers first', text: 'Every feature exists to save a harvest. If it does not help a farmer act faster, it does not ship.' },
  { icon: '🔬', title: 'Scientific honesty', text: 'Confidence scores, provider labels, expert validation — VORTEX never overstates what AI knows.' },
  { icon: '🤝', title: 'Human + machine', text: 'AI scales, experts judge. The two together beat either alone.' },
  { icon: '🔒', title: 'Data respect', text: 'A farmer\'s field data belongs to the farmer. Minimal collection, encrypted at rest, never sold.' },
];

const ARCH = [
  { layer: 'Premium 3D Frontend', tech: 'React · React Three Fiber · GSAP · Tailwind', desc: 'The experience layer — immersive, fast, accessible on any phone.' },
  { layer: 'REST API', tech: 'Express · JWT · RBAC · zod validation', desc: 'Every action passes authentication, authorization and validation.' },
  { layer: 'Backend Services', tech: 'Analysis pipeline · Notifications · Media signing', desc: 'Business logic orchestrating AI, storage and expert workflows.' },
  { layer: 'Database', tech: 'PostgreSQL · Prisma ORM · 15 relational tables', desc: 'The single source of truth — users, crops, diseases, analyses, reviews.' },
  { layer: 'AI & Storage', tech: 'Pluggable providers (Gemini / OpenAI / labelled mock) · sharp-validated uploads', desc: 'Replaceable AI, S3-ready storage, honest labelling at every step.' },
];

export default function About() {
  const ref = useGsapReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="pt-32 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="About VORTEX"
          title={<>An intelligence layer for <span className="gradient-text">every field in India</span></>}
          subtitle="VORTEX is a full-stack crop disease guidance platform: farmers photograph a symptom, AI proposes a diagnosis with honest confidence, plant pathologists validate the uncertain cases, and every step is recorded in a real database."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {VALUES.map((v, i) => (
            <GlassCard key={v.title} hover data-reveal data-reveal-delay={i * 0.08}>
              <span className="text-3xl">{v.icon}</span>
              <h3 className="mt-3 font-display font-700 text-cream">{v.title}</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">{v.text}</p>
            </GlassCard>
          ))}
        </div>

        <SectionHeading eyebrow="Architecture" title={<>Built like infrastructure, <span className="gradient-text">not a demo</span></>} align="left" />
        <div className="space-y-3 mb-16">
          {ARCH.map((a, i) => (
            <GlassCard key={a.layer} hover className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 !p-5" data-reveal data-reveal-delay={i * 0.06}>
              <div className="md:w-56 shrink-0">
                <p className="font-display font-700 text-neon text-sm">{a.layer}</p>
                <p className="text-[11px] font-mono text-muted/70 mt-0.5">{a.tech}</p>
              </div>
              <p className="text-sm text-muted leading-relaxed">{a.desc}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="relative text-center !p-12" data-reveal>
          <HoloCorners />
          <h3 className="text-2xl font-display font-700 text-cream">See the pipeline in action</h3>
          <p className="mt-3 text-sm text-muted max-w-xl mx-auto">
            Create a farmer account, upload a leaf photo and watch a real record travel through upload → AI → guidance → expert review.
          </p>
          <div className="mt-7 flex justify-center gap-4 flex-wrap">
            <ButtonLink to="/register" size="lg">Get started free</ButtonLink>
            <ButtonLink to="/how-it-works" variant="secondary" size="lg">Read the workflow</ButtonLink>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
