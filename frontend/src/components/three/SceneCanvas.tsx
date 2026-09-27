// Shared R3F canvas wrapper — tier-aware DPR/antialias, consistent background.
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { TIER_DPR, type PerfTier } from '../../hooks/usePerfTier';

export function SceneCanvas({
  tier,
  children,
  className,
  camera,
  frameloop = 'always',
}: {
  tier: PerfTier;
  children: React.ReactNode;
  className?: string;
  camera?: { position?: [number, number, number]; fov?: number };
  frameloop?: 'always' | 'demand';
}) {
  return (
    <Canvas
      className={className}
      dpr={TIER_DPR[tier]}
      frameloop={frameloop}
      camera={{ position: [0, 2.2, 9], fov: 50, ...camera } as never}
      gl={{
        antialias: tier === 'HIGH',
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#030705');
      }}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
