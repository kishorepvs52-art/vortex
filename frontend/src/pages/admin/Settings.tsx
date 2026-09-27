// Admin — runtime platform settings (confidence threshold, announcements, maintenance).
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminPutSetting, adminSettings } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { GlassCard, Panel } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Feedback';
import { toast } from '../../store/toastStore';
import { fmtDateTime } from '../../lib/format';

const KEY_THRESHOLD = 'expert_review_threshold';
const KEY_ANNOUNCEMENT = 'platform_announcement';
const KEY_MAINTENANCE = 'maintenance_mode';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6.5 rounded-full transition-colors border ${
        checked ? 'bg-danger/30 border-danger/60' : 'bg-white/5 border-white/15'
      }`}
      style={{ height: '1.625rem' }}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
          checked ? 'left-[calc(100%-1.375rem)] bg-danger shadow-[0_0_10px_rgba(255,92,92,0.7)]' : 'left-0.5 bg-muted'
        }`}
      />
    </button>
  );
}

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: adminSettings });

  const valueOf = (key: string) => settings?.find((s) => s.key === key)?.value ?? '';

  // Local editable state, synced whenever fresh data arrives.
  const [threshold, setThreshold] = useState('0.75');
  const [announcement, setAnnouncement] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setThreshold(valueOf(KEY_THRESHOLD) || '0.75');
    setAnnouncement(valueOf(KEY_ANNOUNCEMENT));
    setMaintenance(valueOf(KEY_MAINTENANCE) === 'true');
    setSynced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const save = async (key: string, value: string, okMsg: string) => {
    setPendingKey(key);
    try {
      await adminPutSetting(key, value);
      toast.success(okMsg, 'Saved to PostgreSQL — effective immediately, no restart needed.');
      await qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['crops'] });
    } catch (e) {
      toast.error('Save failed', e instanceof ApiClientError ? e.message : undefined);
      setSynced(false); // force re-sync from server below
    } finally {
      setPendingKey(null);
    }
  };

  if (isLoading || !settings) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const thresholdNum = Number(threshold);
  const thresholdValid = Number.isFinite(thresholdNum) && thresholdNum >= 0 && thresholdNum <= 1;
  const liveThreshold = valueOf(KEY_THRESHOLD);
  const liveAnnouncement = valueOf(KEY_ANNOUNCEMENT);
  const liveMaintenance = valueOf(KEY_MAINTENANCE) === 'true';

  return (
    <div className="space-y-5 animate-fade-up">
      <Panel>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">⚙️ Platform settings</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Runtime configuration stored in the <span className="font-mono text-cream/80">SystemSetting</span> table and
          read by the API on every request — no restarts, no deploys.
        </p>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Confidence threshold */}
        <GlassCard>
          <h2 className="font-display font-700 text-cream flex items-center gap-2">🎯 Expert review threshold</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            AI results below this confidence — or with no catalogue match — are routed to the expert review queue instead
            of going straight to the farmer.
          </p>

          <div className="mt-5">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={thresholdValid ? thresholdNum : Number(liveThreshold) || 0.75}
                onChange={(e) => setThreshold(e.target.value)}
                className="flex-1 h-1.5 rounded-full appearance-none bg-white/10 accent-neon cursor-pointer"
                aria-label="Confidence threshold"
              />
              <Input
                className="!w-24 text-center font-mono"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                inputMode="decimal"
              />
            </div>
            {!thresholdValid && <p className="text-xs text-danger mt-2">Must be a number between 0 and 1.</p>}
            <div className="flex justify-between text-[10px] font-mono text-muted/60 mt-1">
              <span>0 — everything goes to experts</span>
              <span>1 — only perfect AI skips review</span>
            </div>
            <div className="flex justify-between mt-5">
              <p className="text-xs text-muted self-center">
                Live value: <span className="font-mono text-neon">{liveThreshold || '—'}</span>
              </p>
              <Button
                size="sm"
                disabled={!thresholdValid || String(Number(liveThreshold)) === String(thresholdNum)}
                loading={pendingKey === KEY_THRESHOLD}
                onClick={() => void save(KEY_THRESHOLD, String(thresholdNum), 'Threshold updated')}
              >
                Apply threshold
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Announcement */}
        <GlassCard>
          <h2 className="font-display font-700 text-cream flex items-center gap-2">📢 Platform announcement</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Published with the public health payload — surfaces as a banner on the landing page while non-empty. Clear
            the text and publish to hide it.
          </p>
          <div className="mt-5 space-y-4">
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="e.g. Scheduled maintenance Sunday 2–4 AM IST. New rice disease models added!"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted/60">{announcement.length}/500</span>
              <Button
                size="sm"
                loading={pendingKey === KEY_ANNOUNCEMENT}
                disabled={announcement === liveAnnouncement}
                onClick={() => void save(KEY_ANNOUNCEMENT, announcement, announcement ? 'Announcement published' : 'Announcement cleared')}
              >
                {announcement ? 'Publish' : 'Clear announcement'}
              </Button>
            </div>
            {liveAnnouncement && (
              <div className="glass border-amber/25 rounded-xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-amber mb-1">Currently live</p>
                <p className="text-sm text-cream/90">{liveAnnouncement}</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Maintenance */}
        <GlassCard className={maintenance ? 'border-danger/30' : ''}>
          <h2 className="font-display font-700 text-cream flex items-center gap-2">🚧 Maintenance mode</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            When ON, the public health endpoint reports maintenance and new analysis uploads are paused with a friendly
            notice — admins keep full access. Use during database work or provider incidents.
          </p>
          <div className="mt-5 flex items-center justify-between glass px-4 py-3 rounded-xl">
            <span className={`text-sm font-display font-600 ${liveMaintenance ? 'text-danger' : 'text-neon'}`}>
              {liveMaintenance ? '⛔ New uploads paused' : '✓ Platform open'}
            </span>
            <Switch
              label="Maintenance mode"
              checked={maintenance}
              onChange={(next) => {
                setMaintenance(next);
                void save(KEY_MAINTENANCE, String(next), next ? 'Maintenance mode ON' : 'Maintenance mode OFF');
              }}
            />
          </div>
          {pendingKey === KEY_MAINTENANCE && <p className="text-[11px] text-muted mt-2 font-mono animate-pulse">saving…</p>}
        </GlassCard>

        {/* Registry */}
        <GlassCard>
          <h2 className="font-display font-700 text-cream flex items-center gap-2">🗄 Setting registry</h2>
          <p className="text-sm text-muted mt-2">Every stored setting, hot-reloaded by the API per request.</p>
          <div className="mt-4 space-y-2">
            {settings.map((s) => (
              <div key={s.id} className="glass px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-cyan">{s.key}</span>
                  <span className="text-cream/85 font-mono truncate max-w-[50%]" title={s.value}>
                    {s.value || <span className="text-muted/50">— empty —</span>}
                  </span>
                </div>
                {s.description && <p className="text-[11px] text-muted/70 mt-1">{s.description}</p>}
                <p className="text-[10px] text-muted/50 font-mono mt-1">
                  updated {fmtDateTime(s.updatedAt)}{s.updatedBy ? ` by ${s.updatedBy.fullName}` : ''}
                </p>
              </div>
            ))}
          </div>
          {!synced && <p className="text-[11px] text-amber mt-3">⚠ A save failed — values re-synced from the server.</p>}
        </GlassCard>
      </div>
    </div>
  );
}
