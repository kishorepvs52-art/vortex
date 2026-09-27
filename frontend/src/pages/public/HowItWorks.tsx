import { useState } from 'react';
import { GlassCard, SectionHeading } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { cn } from '../../lib/cn';

const STEPS = [
  {
    n: '01', actor: 'FARMER', color: '#39ff88', icon: '📸', title: 'Capture & submit',
    text: 'Upload a clear photo of the affected leaf or plant. Pick the crop, describe the symptoms in your own words, add your village. The file is validated on your device first (type & size), then again on the server by inspecting the actual image bytes.',
    points: ['Drag & drop or camera roll', 'JPEG / PNG / WebP up to 8 MB', 'Instant preview + upload progress'],
  },
  {
    n: '02', actor: 'VORTEX AI', color: '#22d3ee', icon: '🧠', title: 'Analyze & identify',
    text: 'The server stores your image, creates a real analysis record and runs the AI pipeline: a vision model inspects lesion patterns, discoloration and crop context, then the prediction is matched against the disease catalogue for your exact crop.',
    points: ['Confidence score (0–100%)', 'Severity: LOW → CRITICAL', 'Visual indicators & reasoning'],
  },
  {
    n: '03', actor: 'SYSTEM', color: '#ffb020', icon: '⚖️', title: 'Route by confidence',
    text: 'If confidence is above the platform threshold (admin-tunable, default 75%), the result goes straight to you with treatment guidance. If it is below — or the label does not match the catalogue — the case is queued for expert review automatically.',
    points: ['High confidence → instant guidance', 'Low confidence → expert queue', 'You can always request a review yourself'],
  },
  {
    n: '04', actor: 'EXPERT', color: '#a855f7', icon: '🧑‍🔬', title: 'Validate & correct',
    text: 'A qualified plant pathologist sees your image, symptoms and the AI\'s reasoning. They approve the AI result or correct the disease, set the final severity, and write the definitive treatment and prevention plan.',
    points: ['Race-safe case claiming', 'Approve or correct the AI', 'Expert-authored guidance & comments'],
  },
  {
    n: '05', actor: 'FARMER', color: '#39ff88', icon: '🌾', title: 'Act & track',
    text: 'You receive a notification the moment the final result lands: the disease, severity, step-by-step treatment (organic + chemical options), safety notes and prevention for next season. Everything is saved in your history.',
    points: ['Notification at every milestone', 'Full guidance with dosages', 'Searchable analysis history'],
  },
];

const FAQS = [
  { q: 'Do I need an internet connection in the field?', a: 'You need connectivity to upload and receive results — but one photo is all it takes, and the upload shows real progress even on slow networks. Everything else (validation, analysis, storage, guidance) happens on VORTEX servers.' },
  { q: 'Is the AI diagnosis final?', a: 'No — and VORTEX is honest about that. Every result shows its confidence score. Below the review threshold (default 75%) a human plant pathologist validates the case before you receive the final guidance. You can also request expert review on any result.' },
  { q: 'What happens to my photos?', a: 'Images are validated by their real file content (not just the extension), stripped of EXIF metadata, resized and stored privately. They are served through signed, expiring links — visible only to you, the assigned expert, and platform admins.' },
  { q: 'Which crops are supported?', a: 'The seeded catalogue covers 12 major Indian crops — rice, tomato, potato, maize, cotton, sugarcane, banana, coconut, groundnut, chilli, wheat and mango — with ~45 curated disease profiles. Admins can extend the catalogue live.' },
  { q: 'Who are the experts?', a: 'Registered plant pathology professionals whose credentials are verified and approved by platform admins before they can access any case. Their name and specialization appear on every review they complete.' },
];

export default function HowItWorks() {
  const ref = useGsapReveal<HTMLDivElement>();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div ref={ref} className="pt-32 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="How It Works"
          title={<>From leaf photo to <span className="gradient-text">field action</span> — in five steps</>}
          subtitle="Every step below is a real, working part of the VORTEX pipeline: real uploads, real database records, real AI routing, real expert review."
        />

        <div className="space-y-6 mb-24">
          {STEPS.map((s, i) => (
            <div key={s.n} data-reveal className={cn('flex flex-col md:flex-row gap-5', i % 2 && 'md:flex-row-reverse')}>
              <GlassCard hover className="md:w-2/3 relative overflow-hidden !p-7">
                <div className="absolute -right-8 -top-8 text-[7rem] font-display font-700 opacity-[0.05] select-none" style={{ color: s.color }}>
                  {s.n}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{s.icon}</span>
                  <Badge color="grey">{s.actor}</Badge>
                </div>
                <h3 className="text-xl font-display font-700 text-cream">{s.title}</h3>
                <p className="mt-3 text-sm text-muted leading-relaxed">{s.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <span key={p} className="text-[11px] px-2.5 py-1 rounded-lg border font-mono" style={{ borderColor: `${s.color}33`, color: s.color, background: `${s.color}0d` }}>
                      {p}
                    </span>
                  ))}
                </div>
              </GlassCard>
              <div className="md:w-1/3 flex items-center">
                <div className="glass w-full p-5 text-center relative">
                  <div className="w-16 h-16 mx-auto rounded-2xl neon-border flex items-center justify-center text-3xl animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                    {s.icon}
                  </div>
                  <p className="mt-3 font-mono text-[11px] text-muted/70">STEP {s.n}</p>
                  <p className="font-display font-700 text-sm mt-1" style={{ color: s.color }}>{s.actor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading eyebrow="FAQ" title="Questions farmers actually ask" />
        <div className="space-y-3 mb-20 max-w-3xl mx-auto">
          {FAQS.map((f, i) => (
            <GlassCard key={f.q} className={cn('!p-0 overflow-hidden transition-colors', openFaq === i && 'border-neon/30')} data-reveal>
              <button
                className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span className="font-display font-600 text-sm text-cream">{f.q}</span>
                <span className={cn('text-neon transition-transform duration-300 shrink-0', openFaq === i && 'rotate-45')}>＋</span>
              </button>
              {openFaq === i && (
                <p className="px-6 pb-5 text-sm text-muted leading-relaxed animate-fade-up">{f.a}</p>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="text-center" data-reveal>
          <ButtonLink to="/register" size="lg">Start analyzing — it's free</ButtonLink>
        </div>
      </div>
    </div>
  );
}
