// Analyze Crop — the real upload + analysis submission form.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Panel, GlassCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea, Checkbox } from '../../components/ui/Input';
import { Dropzone } from '../../components/upload/Dropzone';
import { ProgressBar } from '../../components/ui/Feedback';
import { toast } from '../../store/toastStore';
import { getCrops, createAnalysis } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { fmtBytes } from '../../lib/format';

export default function AnalyzeCrop() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: crops } = useQuery({ queryKey: ['crops'], queryFn: getCrops });

  // image state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // form state
  const [cropTypeId, setCropTypeId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [requestReview, setRequestReview] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill location from the farmer profile
  useEffect(() => {
    const fp = user?.farmerProfile;
    if (fp && !locationText) {
      setLocationText([fp.village, fp.district, fp.state].filter(Boolean).join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const selectedCrop = useMemo(() => crops?.find((c) => c.id === cropTypeId), [crops, cropTypeId]);

  const onFile = (f: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  const onClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation unavailable', 'Enter your location manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setLocating(false);
        toast.success('Location captured', `Lat ${pos.coords.latitude.toFixed(3)}, Lng ${pos.coords.longitude.toFixed(3)}`);
      },
      () => {
        setLocating(false);
        toast.warning('Could not get your location', 'Enter your village/district manually — GPS is optional.');
      },
      { timeout: 10_000 },
    );
  };

  const canSubmit = Boolean(file) && Boolean(cropTypeId) && !uploading;

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('cropTypeId', cropTypeId);
      if (symptoms.trim()) fd.append('symptoms', symptoms.trim());
      if (locationText.trim()) fd.append('locationText', locationText.trim());
      if (latitude) fd.append('latitude', latitude);
      if (longitude) fd.append('longitude', longitude);
      fd.append('requestExpertReview', String(requestReview));

      const res = await createAnalysis(fd, setProgress);
      toast.success('Image uploaded!', 'VORTEX AI is analyzing your crop — watch the live scan.');
      navigate(`/app/analyze/${res.id}/processing`, { replace: true });
    } catch (e) {
      setUploading(false);
      const msg = e instanceof ApiClientError ? e.message : 'Upload failed — please try again';
      setError(msg);
      toast.error('Upload failed', msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-700 text-cream">🔬 Analyze a crop</h1>
        <p className="text-sm text-muted mt-1.5">
          Upload one clear photo of the affected leaf or plant. Well-lit, in-focus, single leaf works best.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: image */}
        <div className="lg:col-span-3 space-y-5">
          <Panel>
            <h2 className="font-display font-700 text-cream mb-4 text-sm uppercase tracking-[0.15em]">1 · Crop image</h2>
            <Dropzone
              file={file}
              previewUrl={previewUrl}
              progress={progress}
              uploading={uploading}
              onFile={onFile}
              onClear={onClear}
            />
            {file && !uploading && (
              <p className="mt-3 text-[11px] text-muted/70 font-mono">
                selected: {file.name} · {fmtBytes(file.size)} · will be validated & re-encoded server-side
              </p>
            )}
          </Panel>

          <Panel>
            <h2 className="font-display font-700 text-cream mb-4 text-sm uppercase tracking-[0.15em]">2 · Symptoms & context</h2>
            <div className="space-y-4">
              <Field label="What are you seeing?" hint="Optional but strongly recommended — improves accuracy (e.g. 'brown spots with yellow rings on lower leaves')">
                {(id) => (
                  <Textarea
                    id={id}
                    rows={3}
                    maxLength={1200}
                    placeholder="Describe the symptoms in your own words…"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                )}
              </Field>
              <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Farm location" hint="Village / district — helps experts understand regional pressure">
                  {(id) => <Input id={id} placeholder="Sulur, Coimbatore, Tamil Nadu" value={locationText} onChange={(e) => setLocationText(e.target.value)} maxLength={200} />}
                </Field>
                <Button type="button" variant="secondary" onClick={useMyLocation} loading={locating} className="h-[42px]">
                  📍 Use GPS
                </Button>
              </div>
              {(latitude || longitude) && (
                <p className="text-[11px] font-mono text-neon/80">GPS captured: {latitude}, {longitude}</p>
              )}
              <Checkbox
                label={
                  <>
                    Also request <span className="text-violet font-600">expert validation</span> regardless of AI confidence
                    <span className="block text-[11px] text-muted/70 mt-0.5">A plant pathologist will double-check this diagnosis.</span>
                  </>
                }
                checked={requestReview}
                onChange={(e) => setRequestReview(e.target.checked)}
              />
            </div>
          </Panel>
        </div>

        {/* Right: crop + submit */}
        <div className="lg:col-span-2 space-y-5">
          <Panel>
            <h2 className="font-display font-700 text-cream mb-4 text-sm uppercase tracking-[0.15em]">3 · Crop type</h2>
            <Field label="Which crop is this?" required>
              {(id) => (
                <Select id={id} value={cropTypeId} onChange={(e) => setCropTypeId(e.target.value)} required>
                  <option value="">Select crop…</option>
                  {crops?.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name} — {c.diseaseCount} diseases tracked</option>
                  ))}
                </Select>
              )}
            </Field>
            {selectedCrop && (
              <div className="mt-4 rounded-xl bg-neon/[0.05] border border-neon/20 px-4 py-3 animate-fade-up">
                <p className="text-sm font-display font-600 text-neon">{selectedCrop.emoji} {selectedCrop.name}</p>
                <p className="text-[11px] text-muted italic mt-0.5">{selectedCrop.scientificName}</p>
                {selectedCrop.description && <p className="text-xs text-muted mt-2 leading-relaxed">{selectedCrop.description}</p>}
              </div>
            )}
          </Panel>

          <GlassCard className="relative">
            <h2 className="font-display font-700 text-cream mb-3 text-sm uppercase tracking-[0.15em]">4 · Submit for analysis</h2>
            <ul className="space-y-2 text-xs text-muted mb-5">
              <li className={file ? 'text-neon' : ''}>{file ? '✓' : '○'} Crop image attached</li>
              <li className={cropTypeId ? 'text-neon' : ''}>{cropTypeId ? '✓' : '○'} Crop type selected</li>
              <li className={symptoms.trim() ? 'text-neon' : 'text-muted/60'}>{symptoms.trim() ? '✓' : '○'} Symptoms described (optional)</li>
            </ul>

            {error && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger mb-4">{error}</div>
            )}

            {uploading && (
              <div className="mb-4">
                <ProgressBar value={progress} />
                <p className="text-center text-[11px] font-mono text-neon mt-2">uploading… {progress}%</p>
              </div>
            )}

            <Button className="w-full" size="lg" disabled={!canSubmit} loading={uploading} onClick={() => void submit()}>
              {uploading ? 'Uploading…' : '🚀 Submit for AI analysis'}
            </Button>
            <p className="text-[10px] text-muted/60 mt-3 leading-relaxed">
              Your image is validated, privately stored and analyzed by the VORTEX AI pipeline.
              Results typically arrive in seconds; low-confidence cases go to a human expert.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
