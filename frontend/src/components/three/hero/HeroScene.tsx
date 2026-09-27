// ═══════════════════════════════════════════════════════════════
// VORTEX hero scene composition — fog, lights, camera rig with
// mouse parallax, soil shader, instanced crop field, focal plant +
// scan rings, fireflies, neural web, holo chips, bloom (HIGH only).
// ═══════════════════════════════════════════════════════════════
import { Suspense, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { PerfTier } from '../../../hooks/usePerfTier';
import { SceneCanvas } from '../SceneCanvas';
import { SoilPlane } from './SoilPlane';
import { PlantField, HeroPlant } from './PlantField';
import { Fireflies, NeuralWeb } from './Particles';
import { ScanRings, HoloChips } from './HoloElements';

function CameraRig({ tier }: { tier: PerfTier }) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 1.1, -1));
  const current = useRef(new THREE.Vector3(0, 2.3, 9.5));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const parallax = tier === 'LOW' ? 0.25 : 1;

    // Slow orbital drift + pointer parallax, all lerped for smoothness
    const desiredX = Math.sin(t * 0.06) * 1.6 + pointer.x * 1.5 * parallax;
    const desiredY = 2.3 + Math.sin(t * 0.09) * 0.25 - pointer.y * 0.85 * parallax;
    const desiredZ = 9.5 + Math.cos(t * 0.05) * 0.5;

    current.current.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), 0.035);
    camera.position.copy(current.current);
    camera.lookAt(target.current);
  });

  return null;
}

function SceneContents({ tier }: { tier: PerfTier }) {
  return (
    <>
      <fogExp2 attach="fog" args={['#030705', tier === 'LOW' ? 0.045 : 0.055]} />

      {/* Atmosphere */}
      <ambientLight intensity={0.35} color="#bfe8cf" />
      <directionalLight position={[6, 10, 4]} intensity={1.1} color="#eaffef" />
      <pointLight position={[-8, 4, -6]} intensity={20} color="#0e7490" distance={26} decay={2} />
      <pointLight position={[8, 3, 2]} intensity={14} color="#39ff88" distance={22} decay={2} />

      <CameraRig tier={tier} />
      <SoilPlane />
      <PlantField tier={tier} />
      <HeroPlant />
      <ScanRings />
      <Fireflies tier={tier} />
      <NeuralWeb tier={tier} />
      <HoloChips tier={tier} />

      {tier === 'HIGH' && <BloomLayer />}
    </>
  );
}

// Bloom isolated so it only mounts on HIGH tier (still statically imported —
// it ships inside the lazy hero chunk, never in the main bundle)
function BloomLayer() {
  return (
    <EffectComposer>
      <Bloom intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.35} mipmapBlur radius={0.72} />
    </EffectComposer>
  );
}

export default function HeroScene({ tier }: { tier: PerfTier }) {
  return (
    <SceneCanvas tier={tier} className="!absolute inset-0" camera={{ position: [0, 2.3, 9.5], fov: 50 }}>
      <Suspense fallback={null}>
        <SceneContents tier={tier} />
      </Suspense>
    </SceneCanvas>
  );
}
