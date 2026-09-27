// ═══════════════════════════════════════════════════════════════
// Interactive 3D workflow: ASK → ANALYZE → IDENTIFY → GUIDE → ACT
// Glowing stage nodes on a curve, energy pulse flowing between them,
// hover/click focus with camera easing. Info cards live in the DOM
// (parent page) so text stays crisp and accessible.
// ═══════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PerfTier } from '../../../hooks/usePerfTier';
import { SceneCanvas } from '../SceneCanvas';

import { WORKFLOW_STAGES, type WorkflowStage } from './stages';
export { WORKFLOW_STAGES };
export type { WorkflowStage };

const STAGE_X = [-8, -4, 0, 4, 8];

// ── energy path ──
const pathVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const pathFrag = /* glsl */ `
uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
void main(){
  float flow = fract(vUv.x * 2.0 - uTime * 0.22);
  float pulse = smoothstep(0.0, 0.5, flow) * smoothstep(1.0, 0.5, flow);
  float base = 0.10;
  gl_FragColor = vec4(uColor * (base + pulse * 1.8), base + pulse * 0.85);
}
`;

function EnergyPath() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      STAGE_X.map((x, i) => new THREE.Vector3(x, 0.2 + (i % 2 === 0 ? 0 : 0.35), 0)),
      false,
      'catmullrom',
      0.4,
    );
    return new THREE.TubeGeometry(curve, 160, 0.035, 8, false);
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color('#39ff88') } }), []);
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={pathVert}
        fragmentShader={pathFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── stage node ──
function StageNode({
  stage,
  index,
  active,
  tier,
  onSelect,
}: {
  stage: WorkflowStage;
  index: number;
  active: boolean;
  tier: PerfTier;
  onSelect: (i: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!group.current) return;
    const targetScale = active ? 1.35 : hovered ? 1.15 : 1;
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    group.current.position.y = 1.05 + Math.sin(t * 1.1 + index * 1.3) * (active ? 0.16 : 0.09);
    if (ring.current) ring.current.rotation.z = t * (0.6 + index * 0.1);
    if (ring2.current) {
      ring2.current.rotation.x = t * 0.5;
      ring2.current.rotation.y = t * 0.3;
    }
    if (core.current) {
      const mat = core.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, active ? 2.4 : hovered ? 1.6 : 0.9, 0.08);
    }
  });

  return (
    <group ref={group} position={[STAGE_X[index], 1.05, 0]}>
      {/* clickable core */}
      <mesh
        ref={core}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <icosahedronGeometry args={[0.52, 1]} />
        <meshStandardMaterial
          color={stage.color}
          emissive={stage.color}
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.4}
          flatShading
        />
      </mesh>

      {/* gyro rings */}
      <mesh ref={ring}>
        <torusGeometry args={[0.78, 0.015, 8, 64]} />
        <meshBasicMaterial color={stage.color} transparent opacity={active ? 0.95 : 0.5} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.92, 0.008, 8, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={active ? 0.6 : 0.25} />
      </mesh>

      {/* base pedestal glow */}
      <mesh position={[0, -1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.62, 40]} />
        <meshBasicMaterial color={stage.color} transparent opacity={active ? 0.5 : 0.18} side={THREE.DoubleSide} />
      </mesh>

      {/* icon + label */}
      <Html center distanceFactor={9} position={[0, 0, 0]} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <span className="text-2xl select-none" aria-hidden>{stage.icon}</span>
      </Html>
      <Html center distanceFactor={9} position={[0, -1.5, 0]} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <span
          className="text-[11px] font-display font-bold tracking-[0.3em] whitespace-nowrap select-none"
          style={{ color: active || hovered ? stage.color : '#9db8a6', textShadow: active ? `0 0 14px ${stage.color}90` : 'none' }}
        >
          {stage.title}
        </span>
      </Html>

      {active && tier !== 'LOW' && <pointLight color={stage.color} intensity={6} distance={5} decay={2} />}
    </group>
  );
}

function WorkflowRig({ active }: { active: number }) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 2.4, 11));
  useFrame(() => {
    const targetX = STAGE_X[active] * 0.55;
    pos.current.lerp(new THREE.Vector3(targetX, 2.4, 10.5), 0.045);
    camera.position.copy(pos.current);
    camera.lookAt(STAGE_X[active] * 0.8, 0.9, 0);
  });
  return null;
}

function SceneContents({ active, onSelect, tier }: { active: number; onSelect: (i: number) => void; tier: PerfTier }) {
  return (
    <>
      <fogExp2 attach="fog" args={['#030705', 0.045]} />
      <ambientLight intensity={0.4} color="#cdeedd" />
      <directionalLight position={[4, 8, 6]} intensity={0.9} />
      <WorkflowRig active={active} />
      <EnergyPath />
      {WORKFLOW_STAGES.map((s, i) => (
        <StageNode key={s.key} stage={s} index={i} active={i === active} tier={tier} onSelect={onSelect} />
      ))}
      {/* ground reflection disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color="#04120a" roughness={0.35} metalness={0.6} transparent opacity={0.85} />
      </mesh>
    </>
  );
}

export default function WorkflowScene({
  tier,
  active,
  onSelect,
}: {
  tier: PerfTier;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <SceneCanvas tier={tier} className="!absolute inset-0" camera={{ position: [0, 2.4, 11], fov: 46 }}>
      <SceneContents active={active} onSelect={onSelect} tier={tier} />
    </SceneCanvas>
  );
}
