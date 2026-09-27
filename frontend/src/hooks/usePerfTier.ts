// ═══════════════════════════════════════════════════════════════
// Performance tier detection — decides how much 3D the device gets.
//   HIGH   → full effects (bloom, 6k particles, dpr 2)
//   MEDIUM → reduced (no bloom, 2.5k particles, dpr 1.5)
//   LOW    → minimal (800 particles, dpr 1, static-ish)
//   OFF    → no WebGL at all; CSS aurora identity keeps the brand
// Signals: software renderer, device memory, cores, mobile UA,
// prefers-reduced-motion. Runtime FPS probe can downgrade live.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export type PerfTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'OFF';

let cachedTier: PerfTier | null = null;

function detectTier(): PerfTier {
  if (cachedTier) return cachedTier;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return (cachedTier = 'OFF');

  if (typeof document === 'undefined') return (cachedTier = 'OFF');

  // Software / blocklisted GPU → no WebGL experience
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return (cachedTier = 'OFF');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '').toLowerCase();
      if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(renderer)) {
        return (cachedTier = 'OFF');
      }
    }
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    loseCtx?.loseContext();
  } catch {
    return (cachedTier = 'OFF');
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 768;

  let tier: PerfTier = 'HIGH';
  if (mem <= 4 || cores <= 4 || (coarse && small)) tier = 'MEDIUM';
  if (mem <= 2 || cores <= 2) tier = 'LOW';
  if (coarse && mem <= 4) tier = 'LOW';

  return (cachedTier = tier);
}

export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>(() => detectTier());

  useEffect(() => {
    setTier(detectTier());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      cachedTier = null;
      setTier(detectTier());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return tier;
}

/** Runtime FPS probe — downgrades tier when the GPU can't keep up. */
export function useFpsDowngrade(active: boolean, onLowFps: () => void) {
  useEffect(() => {
    if (!active) return;
    let frames = 0;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const elapsed = performance.now() - start;
      if (elapsed >= 2500) {
        const fps = (frames / elapsed) * 1000;
        if (fps < 28) onLowFps();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, onLowFps]);
}

export const TIER_PARTICLES = { HIGH: 6000, MEDIUM: 2500, LOW: 800, OFF: 0 } as const;
export const TIER_DPR: Record<PerfTier, [number, number]> = {
  HIGH: [1, 2],
  MEDIUM: [1, 1.5],
  LOW: [1, 1],
  OFF: [1, 1],
};
