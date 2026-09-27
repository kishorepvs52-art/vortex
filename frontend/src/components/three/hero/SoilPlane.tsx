// Neon soil grid — shader-driven holographic ground plane.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertex = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec3 vPos;

void main() {
  float d = length(vPos.xy);

  // rectangular grid
  vec2 coord = vPos.xy * 0.5;
  vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
  float grid = 1.0 - min(min(g.x, g.y), 1.0);

  // expanding energy rings
  float ringPhase = fract(d * 0.28 - uTime * 0.05);
  float ring = smoothstep(0.06, 0.0, abs(ringPhase - 0.5) - 0.47);
  float pulse = 0.55 + 0.45 * sin(uTime * 0.9 - d * 0.55);

  // distance fade keeps the horizon soft under fog
  float fade = smoothstep(30.0, 3.0, d);
  float center = smoothstep(9.0, 0.0, d) * 0.25;

  vec3 col = mix(uColor, uColor2, smoothstep(4.0, 26.0, d));
  float intensity = grid * 0.42 + ring * (0.35 + 0.5 * pulse) + center;

  gl_FragColor = vec4(col * intensity * fade, intensity * fade * 0.9);
}
`;

export function SoilPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#39ff88') },
      uColor2: { value: new THREE.Color('#0e7490') },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <circleGeometry args={[32, 72]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
