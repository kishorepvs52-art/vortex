// Two GPU particle systems:
//  • Fireflies  — warm neon-green motes rising through the field
//  • Neural web — cyan AI constellation drifting overhead
// Counts scale with perf tier; animation is fully shader-side (zero CPU).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PerfTier } from '../../../hooks/usePerfTier';

// ─────────────────────────── Fireflies ───────────────────────────

const fireflyVert = /* glsl */ `
uniform float uTime;
uniform float uSize;
attribute float aSeed;
varying float vTwinkle;
void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.12 + aSeed * 0.22), 8.5) - 0.8;
  p.x += sin(uTime * 0.35 + aSeed * 42.0) * 0.5;
  p.z += cos(uTime * 0.28 + aSeed * 31.0) * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vTwinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.4 + aSeed * 2.2) + aSeed * 60.0), 2.0);
  gl_PointSize = uSize * (0.45 + aSeed * 0.9) * (140.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const fireflyFrag = /* glsl */ `
uniform vec3 uColor;
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.04, d) * vTwinkle;
  gl_FragColor = vec4(uColor * a * 1.6, a);
}
`;

export function Fireflies({ tier }: { tier: PerfTier }) {
  const count = tier === 'HIGH' ? 2600 : tier === 'MEDIUM' ? 1100 : 350;
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 20;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.random() * 8.5 - 0.8;
      positions[i * 3 + 2] = Math.sin(a) * r - 2;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [count]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uSize: { value: 2.2 }, uColor: { value: new THREE.Color('#7dffa8') } }),
    [],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={fireflyVert}
        fragmentShader={fireflyFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────── Neural web ───────────────────────────

export function NeuralWeb({ tier }: { tier: PerfTier }) {
  const group = useRef<THREE.Group>(null);
  const nodeCount = tier === 'HIGH' ? 110 : tier === 'MEDIUM' ? 60 : 26;

  const { nodePositions, linePositions } = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 14;
      nodes.push(new THREE.Vector3(Math.cos(a) * r, 4.2 + Math.random() * 5.5, Math.sin(a) * r - 4));
    }
    const lines: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 4.6) {
          lines.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }
    const nodePositions = new Float32Array(nodes.flatMap((n) => [n.x, n.y, n.z]));
    return { nodePositions, linePositions: new Float32Array(lines) };
  }, [nodeCount]);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.018;
      group.current.position.y = Math.sin(clock.elapsedTime * 0.22) * 0.25;
    }
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#22d3ee"
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {linePositions.length > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#22d3ee" transparent opacity={0.13} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}
    </group>
  );
}
