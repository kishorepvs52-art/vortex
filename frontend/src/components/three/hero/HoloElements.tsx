// Holographic scan rings around the focal plant + floating glass UI chips.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PerfTier } from '../../../hooks/usePerfTier';

export function ScanRings() {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (r1.current) {
      r1.current.rotation.z = t * 0.5;
      r1.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.15;
    }
    if (r2.current) {
      r2.current.rotation.z = -t * 0.35;
      r2.current.rotation.y = Math.cos(t * 0.25) * 0.2;
    }
    if (r3.current) {
      r3.current.position.y = 1.3 + Math.sin(t * 1.6) * 0.55;
      r3.current.rotation.y = t * 1.1;
    }
  });

  return (
    <group position={[0, 0, -1]}>
      <mesh ref={r1} position={[0, 1.25, 0]}>
        <torusGeometry args={[1.55, 0.014, 8, 96]} />
        <meshBasicMaterial color="#39ff88" transparent opacity={0.75} />
      </mesh>
      <mesh ref={r2} position={[0, 1.25, 0]} rotation={[0.5, 0.2, 0]}>
        <torusGeometry args={[1.85, 0.008, 8, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </mesh>
      {/* scanning sweep ring travelling up the plant */}
      <group ref={r3}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.85, 0.02, 8, 64]} />
          <meshBasicMaterial color="#aaffcc" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

const CHIPS: { pos: [number, number, number]; icon: string; title: string; sub: string; accent: string }[] = [
  { pos: [3.6, 2.9, -1.2], icon: '◉', title: 'LEAF SCAN ACTIVE', sub: 'spectral analysis · 4 bands', accent: '#39ff88' },
  { pos: [-3.9, 2.2, -0.4], icon: '◈', title: 'AI CONFIDENCE 96.2%', sub: 'early blight · fungal', accent: '#22d3ee' },
  { pos: [3.1, 0.7, 1.8], icon: '✦', title: 'GUIDANCE READY', sub: 'organic + chemical plan', accent: '#a855f7' },
];

export function HoloChips({ tier }: { tier: PerfTier }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((chip, i) => {
      chip.position.y = CHIPS[i].pos[1] + Math.sin(t * 0.8 + i * 2.1) * 0.14;
    });
  });

  if (tier === 'LOW') return null;

  return (
    <group ref={group}>
      {CHIPS.map((chip, i) => (
        <group key={i} position={chip.pos}>
          <Html center distanceFactor={11} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md whitespace-nowrap"
              style={{
                background: 'rgba(4,18,10,0.72)',
                borderColor: `${chip.accent}55`,
                boxShadow: `0 0 18px ${chip.accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              <span style={{ color: chip.accent }} className="text-sm animate-pulse">{chip.icon}</span>
              <span>
                <span className="block text-[10px] font-display font-bold tracking-[0.14em]" style={{ color: chip.accent }}>
                  {chip.title}
                </span>
                <span className="block text-[9px] text-[#9db8a6] font-mono">{chip.sub}</span>
              </span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
