// Instanced stylised crop field — one draw call per part (stem + leaves),
// gentle wind sway computed per-instance. Count scales with perf tier.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PerfTier } from '../../../hooks/usePerfTier';

interface PlantInstance {
  pos: THREE.Vector3;
  rotY: number;
  scale: number;
  phase: number;
  hue: THREE.Color;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeLeafGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.16, 0.28, 0.14, 0.72, 0, 1.05);
  shape.bezierCurveTo(-0.14, 0.72, -0.16, 0.28, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 10);
  return geo;
}

const LEAVES_PER_PLANT = 4;

export function PlantField({ tier }: { tier: PerfTier }) {
  const count = tier === 'HIGH' ? 130 : tier === 'MEDIUM' ? 70 : 34;
  const animate = tier !== 'LOW';

  const stemRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const leafGeo = useMemo(() => makeLeafGeometry(), []);

  const plants = useMemo<PlantInstance[]>(() => {
    const rand = seededRandom(1337);
    const arr: PlantInstance[] = [];
    const greens = ['#1fd46b', '#39ff88', '#0bbd5b', '#4ade80', '#22c55e'];
    for (let i = 0; i < count; i++) {
      // Two flanking fields, leaving the centre lane clear for the hero focal plant
      const side = rand() > 0.5 ? 1 : -1;
      const x = side * (2.4 + rand() * 11);
      const z = -7 + rand() * 11;
      arr.push({
        pos: new THREE.Vector3(x, 0, z),
        rotY: rand() * Math.PI * 2,
        scale: 0.55 + rand() * 0.9,
        phase: rand() * Math.PI * 2,
        hue: new THREE.Color(greens[Math.floor(rand() * greens.length)]),
      });
    }
    return arr;
  }, [count]);

  // Static base pass
  useMemo(() => {
    // applied in first useFrame; kept here to satisfy exhaustive init order
  }, []);

  useFrame(({ clock }) => {
    const stem = stemRef.current;
    const leaf = leafRef.current;
    if (!stem || !leaf) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const sway = animate ? Math.sin(t * 1.1 + p.phase) * 0.06 : 0;
      const sway2 = animate ? Math.cos(t * 0.8 + p.phase * 1.7) * 0.05 : 0;

      // stem
      dummy.position.copy(p.pos).setY(0.55 * p.scale);
      dummy.rotation.set(sway * 0.6, p.rotY, sway2 * 0.6);
      dummy.scale.set(p.scale, p.scale * 1.1, p.scale);
      dummy.updateMatrix();
      stem.setMatrixAt(i, dummy.matrix);
      stem.setColorAt(i, p.hue.clone().multiplyScalar(0.55));

      // leaves around the stem top
      for (let l = 0; l < LEAVES_PER_PLANT; l++) {
        const idx = i * LEAVES_PER_PLANT + l;
        const angle = p.rotY + (l / LEAVES_PER_PLANT) * Math.PI * 2;
        const tilt = 0.9 + (animate ? Math.sin(t * 1.4 + p.phase + l) * 0.1 : 0);
        dummy.position.set(
          p.pos.x + Math.cos(angle) * 0.06 * p.scale,
          (0.95 + l * 0.05) * p.scale,
          p.pos.z + Math.sin(angle) * 0.06 * p.scale,
        );
        dummy.rotation.set(tilt, angle + Math.PI / 2, sway + sway2);
        dummy.scale.setScalar(p.scale * (0.8 + (l % 2) * 0.3));
        dummy.updateMatrix();
        leaf.setMatrixAt(idx, dummy.matrix);
        leaf.setColorAt(idx, p.hue);
      }
    }

    stem.instanceMatrix.needsUpdate = true;
    leaf.instanceMatrix.needsUpdate = true;
    if (stem.instanceColor) stem.instanceColor.needsUpdate = true;
    if (leaf.instanceColor) leaf.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={stemRef} args={[undefined!, undefined!, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.022, 0.05, 1.1, 5]} />
        <meshStandardMaterial roughness={0.8} metalness={0.05} />
      </instancedMesh>

      <instancedMesh
        ref={leafRef}
        args={[leafGeo, undefined!, count * LEAVES_PER_PLANT]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          side={THREE.DoubleSide}
          roughness={0.55}
          metalness={0.08}
          emissive={new THREE.Color('#0a5c30')}
          emissiveIntensity={0.35}
        />
      </instancedMesh>
    </group>
  );
}

/** The focal hero plant — larger, glowing, scanned by the holo rings. */
export function HeroPlant() {
  const group = useRef<THREE.Group>(null);
  const leaves = useMemo(() => {
    const arr: { angle: number; tilt: number; scale: number; y: number }[] = [];
    for (let i = 0; i < 7; i++) {
      arr.push({
        angle: (i / 7) * Math.PI * 2,
        tilt: 0.55 + (i % 3) * 0.25,
        scale: 1.5 + (i % 2) * 0.5,
        y: 1.1 + (i % 3) * 0.45,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (group.current) {
      const t = clock.elapsedTime;
      group.current.rotation.y = Math.sin(t * 0.15) * 0.25;
      group.current.children.forEach((child, i) => {
        child.rotation.z = Math.sin(t * 0.9 + i) * 0.04;
      });
    }
  });

  return (
    <group ref={group} position={[0, 0, -1]}>
      {/* stem */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.11, 2.1, 8]} />
        <meshStandardMaterial color="#0bbd5b" roughness={0.6} emissive="#0a5c30" emissiveIntensity={0.5} />
      </mesh>
      {/* big leaves */}
      {leaves.map((l, i) => (
        <group key={i} position={[0, l.y, 0]} rotation={[0, l.angle, 0]}>
          <mesh rotation={[l.tilt, Math.PI / 2, 0]} scale={l.scale} position={[0.1, 0, 0]}>
            <coneGeometry args={[0.34, 1.5, 4, 1]} />
            <meshStandardMaterial
              color={i % 2 ? '#39ff88' : '#1fd46b'}
              roughness={0.4}
              metalness={0.1}
              emissive="#127a45"
              emissiveIntensity={0.6}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* energy core at the heart of the plant */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color="#aaffcc" transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#39ff88" intensity={8} distance={7} decay={2} />
    </group>
  );
}
