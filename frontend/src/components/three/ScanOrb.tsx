// Compact "analysis in progress" orb — wireframe icosahedron core,
// orbiting scan rings, rising particles. Used on the Processing page
// and (smaller) as dashboard identity.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PerfTier } from '../../hooks/usePerfTier';
import { SceneCanvas } from './SceneCanvas';

function Orb({ tier }: { tier: PerfTier }) {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const points = useRef<THREE.Points>(null);

  const particleGeo = useMemo(() => {
    const n = tier === 'HIGH' ? 900 : tier === 'MEDIUM' ? 400 : 150;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 1.6 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [tier]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (core.current) {
      core.current.rotation.y = t * 0.45;
      core.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      const s = 1 + Math.sin(t * 2.2) * 0.03;
      core.current.scale.setScalar(s);
    }
    if (shell.current) shell.current.rotation.y = -t * 0.25;
    if (ring1.current) {
      ring1.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.7) * 0.35;
      ring1.current.rotation.z = t * 0.8;
    }
    if (ring2.current) {
      ring2.current.rotation.y = t * 0.6;
      ring2.current.rotation.x = Math.cos(t * 0.5) * 0.4;
    }
    if (points.current) points.current.rotation.y = t * 0.12;
  });

  return (
    <group>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial
          color="#0bbd5b"
          emissive="#39ff88"
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={shell}>
        <sphereGeometry args={[1.12, 24, 24]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh ref={ring1}>
        <torusGeometry args={[1.5, 0.016, 8, 90]} />
        <meshBasicMaterial color="#39ff88" transparent opacity={0.85} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[1.72, 0.01, 8, 90]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </mesh>
      <points ref={points} geometry={particleGeo}>
        <pointsMaterial color="#7dffa8" size={0.035} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
      <pointLight color="#39ff88" intensity={10} distance={9} decay={2} />
    </group>
  );
}

export default function ScanOrb({ tier, compact = false }: { tier: PerfTier; compact?: boolean }) {
  return (
    <SceneCanvas tier={tier} className="!absolute inset-0" camera={{ position: [0, 0.4, compact ? 5.4 : 5], fov: 45 }}>
      <fogExp2 attach="fog" args={['#030705', 0.07]} />
      <ambientLight intensity={0.4} />
      <Orb tier={tier} />
    </SceneCanvas>
  );
}
