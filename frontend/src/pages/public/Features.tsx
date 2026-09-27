import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlassCard, SectionHeading } from '../../components/ui/Card';
import { Badge, PathogenBadge } from '../../components/ui/Badge';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { getCrops, getCrop } from '../../api/endpoints';
import { cn } from '../../lib/cn';

const FEATURES = [
  { icon: '🖼️', title: 'Real image pipeline', text: 'Drag & drop upload with device-side and server-side validation, EXIF stripping, auto-resize and thumbnailing via sharp — then private delivery through signed, expiring URLs.' },
  { icon: '🧠', title: 'Pluggable AI providers', text: 'One interface, any brain: Google Gemini or OpenAI vision with a single env var — plus a clearly-labelled mock provider for development that never pretends to be real.' },
  { icon: '📊', title: 'Confidence & severity', text: 'Every diagnosis carries a calibrated confidence ring and a five-step severity meter, with the visual indicators and reasoning behind the call.' },
  { icon: '🧑‍🔬', title: 'Expert review loop', text: 'Low-confidence cases auto-route to verified plant pathologists who approve, correct and author the final treatment plan — with race-safe claiming.' },
  { icon: '🔔', title: 'Live notifications', text: 'Analysis complete, review requested, expert responded — every milestone pushes a real notification to the right user.' },
  { icon: '🗂️', title: 'Full history & audit', text: 'Paginated, filterable analysis history for farmers; an activity log and CSV reports for admins; nothing is a dead-end.' },
  { icon: '🛡️', title: 'Role-based security', text: 'JWT sessions with rotating refresh tokens, bcrypt hashing, RBAC middleware, rate limits, helmet and zod validation on every route.' },
  { icon: '🌐', title: 'Any device, any network', text: 'Fully responsive from 360px phones to 4K desktops, with automatic 3D performance tiers and a reduced-motion mode.' },
];

export default function Features() {
  const ref = useGsapReveal<HTMLDivElement>();
  const { data: crops, isLoading } = useQuery({ queryKey: ['crops'], queryFn: getCrops });
  const [selected, setSelected] = useState<string | null>(null);
  const { data: cropDetail, isFetching } = useQuery({
    queryKey: ['crop', selected],
    queryFn: () => getCrop(selected!),
    enabled: Boolean(selected),
  });

  return (
    <div ref={ref} className="pt-32 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Features"
          title={<>Everything is <span className="gradient-text">actually wired up</span></>}
          subtitle="VORTEX is not a mockup with animations. Every feature below is backed by a real API, a real database row and real file storage."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} hover data-reveal data-reveal-delay={(i % 4) * 0.07}>
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-display font-700 text-cream text-sm">{f.title}</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">{f.text}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Live catalogue explorer (real API data) ── */}
        <SectionHeading
          eyebrow="Live Disease Catalogue"
          title={<>Explore what VORTEX <span className="gradient-text">already knows</span></>}
          subtitle="This data is served live from the PostgreSQL disease catalogue — the same source the AI matches against."
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 space-y-2">
              {crops?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    'w-full glass px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200',
                    selected === c.id ? 'border-neon/50 shadow-neon bg-neon/[0.06]' : 'hover:border-white/25',
                  )}
                >
                  <span className="text-xl" aria-hidden>{c.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className={cn('block text-sm font-display font-600', selected === c.id ? 'text-neon' : 'text-cream')}>{c.name}</span>
                    <span className="block text-[11px] text-muted italic truncate">{c.scientificName}</span>
                  </span>
                  <Badge color="grey">{c.diseaseCount} diseases</Badge>
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              {!selected ? (
                <EmptyState icon="🌾" title="Select a crop" message="Choose a crop on the left to browse its curated disease profiles — symptoms, visible signs, treatment and prevention." className="h-full flex flex-col justify-center" />
              ) : isFetching && !cropDetail ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
              ) : cropDetail ? (
                <div className="space-y-3">
                  <div className="glass px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display font-700 text-cream text-lg">{cropDetail.emoji} {cropDetail.name}</h3>
                      <p className="text-xs text-muted mt-0.5">{cropDetail.description}</p>
                    </div>
                    <Badge color="cyan">{cropDetail.diseases.length} profiles</Badge>
                  </div>
                  {cropDetail.diseases.map((d) => (
                    <GlassCard key={d.id} hover className="!p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <h4 className="font-display font-700 text-cream">{d.name}</h4>
                        <div className="flex gap-2">
                          <PathogenBadge type={d.pathogenType} />
                          <Badge color={d.defaultSeverity === 'CRITICAL' || d.defaultSeverity === 'HIGH' ? 'red' : d.defaultSeverity === 'NONE' ? 'green' : 'amber'}>
                            {d.defaultSeverity}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted leading-relaxed">{d.description}</p>
                      <details className="mt-3 group">
                        <summary className="text-[11px] font-display font-600 text-neon cursor-pointer select-none hover:underline">
                          Symptoms · Signs · Treatment · Prevention
                        </summary>
                        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-[11px] text-muted leading-relaxed">
                          <div><p className="text-cream/80 font-600 mb-1">Symptoms</p>{d.symptoms}</div>
                          {d.visibleSigns && <div><p className="text-cream/80 font-600 mb-1">Visible signs</p>{d.visibleSigns}</div>}
                          <div><p className="text-cream/80 font-600 mb-1">Treatment</p>{d.treatmentSummary.split('\n').map((s, i) => <p key={i}>• {s}</p>)}</div>
                          <div><p className="text-cream/80 font-600 mb-1">Prevention</p>{d.preventiveSummary.split('\n').map((s, i) => <p key={i}>• {s}</p>)}</div>
                        </div>
                      </details>
                    </GlassCard>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-20 text-center" data-reveal>
          <ButtonLink to="/register" size="lg">Analyze your crop with VORTEX</ButtonLink>
        </div>
      </div>
    </div>
  );
}
