import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export interface KnowledgeCore3DProps {
  isOptimized?: boolean;
  onCoreClick?: () => void;
}

function KnowledgeCoreAssembly({
  isOptimized = true,
  onCoreClick,
}: {
  isOptimized: boolean;
  onCoreClick?: () => void;
}) {
  const gltf = useGLTF('/models/academic-knowledge-core.glb');
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const groupRef = useRef<THREE.Group>(null);
  const ringPrimaryRef = useRef<THREE.Object3D | null>(null);
  const ringSecondaryRef = useRef<THREE.Object3D | null>(null);
  const ringHorizonRef = useRef<THREE.Object3D | null>(null);
  const prismCoreRef = useRef<THREE.Object3D | null>(null);
  const innerLuminaryRef = useRef<THREE.Object3D | null>(null);
  const nodesRef = useRef<THREE.Object3D[]>([]);

  const burstRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    burstRef.current = 1.0;
  }, [isOptimized]);

  useEffect(() => {
    ringPrimaryRef.current = clonedScene.getObjectByName('OrbitalRingPrimary') || null;
    ringSecondaryRef.current = clonedScene.getObjectByName('OrbitalRingSecondary') || null;
    ringHorizonRef.current = clonedScene.getObjectByName('OrbitalRingHorizon') || null;
    prismCoreRef.current = clonedScene.getObjectByName('PrismCore') || null;
    innerLuminaryRef.current = clonedScene.getObjectByName('InnerLuminary') || null;

    const nodes: THREE.Object3D[] = [];
    for (let i = 1; i <= 6; i++) {
      const n = clonedScene.getObjectByName(`ScheduleNode_${i}`);
      if (n) nodes.push(n);
    }
    nodesRef.current = nodes;

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (child.name === 'PrismCore') {
            mat.color = new THREE.Color(isOptimized ? '#f97316' : '#ef4444');
            mat.emissive = new THREE.Color(isOptimized ? '#ea580c' : '#b91c1c');
            mat.emissiveIntensity = 0.55;
            mat.roughness = 0.16;
            mat.metalness = 0.15;
          } else if (child.name === 'InnerLuminary') {
            mat.color = new THREE.Color('#fef08a');
            mat.emissive = new THREE.Color('#fde047');
            mat.emissiveIntensity = 1.25;
          } else if (child.name === 'OrbitalRingPrimary') {
            mat.color = new THREE.Color(isOptimized ? '#38bdf8' : '#f59e0b');
            mat.emissive = new THREE.Color(isOptimized ? '#0284c7' : '#d97706');
            mat.emissiveIntensity = 0.4;
          } else if (child.name === 'OrbitalRingSecondary') {
            mat.color = new THREE.Color(isOptimized ? '#34d399' : '#fb923c');
            mat.emissive = new THREE.Color(isOptimized ? '#059669' : '#ea580c');
            mat.emissiveIntensity = 0.35;
          } else if (child.name.startsWith('ScheduleNode')) {
            mat.color = new THREE.Color(isOptimized ? '#fde047' : '#fca5a5');
            mat.emissive = new THREE.Color(isOptimized ? '#f59e0b' : '#ef4444');
            mat.emissiveIntensity = 0.45;
          }
          mesh.material = mat;
        }
      }
    });
  }, [clonedScene, isOptimized]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (burstRef.current > 0.001) {
      burstRef.current = Math.max(0, burstRef.current - delta * 2.0);
    } else {
      burstRef.current = 0;
    }

    const boost = 1 + burstRef.current * 3.5;

    if (prismCoreRef.current) {
      prismCoreRef.current.rotation.y += delta * 0.65 * boost;
      prismCoreRef.current.rotation.x = Math.sin(t * 1.4) * (isOptimized ? 0.15 : 0.35);
    }

    if (innerLuminaryRef.current) {
      innerLuminaryRef.current.rotation.y -= delta * 1.1 * boost;
      const pulse = 1 + Math.sin(t * 3.2) * 0.12;
      innerLuminaryRef.current.scale.setScalar(pulse);
    }

    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.rotation.z += delta * 0.55 * boost;
      ringPrimaryRef.current.rotation.x = Math.PI / 3.8 + Math.sin(t * 0.8) * 0.12;
    }

    if (ringSecondaryRef.current) {
      ringSecondaryRef.current.rotation.y -= delta * 0.48 * boost;
      ringSecondaryRef.current.rotation.z = Math.PI / 3.2 + Math.cos(t * 0.7) * 0.12;
    }

    if (ringHorizonRef.current) {
      ringHorizonRef.current.rotation.z -= delta * 0.35 * boost;
    }

    nodesRef.current.forEach((node, idx) => {
      node.rotation.x += delta * (0.8 + idx * 0.15) * boost;
      node.rotation.y += delta * (0.9 + idx * 0.12) * boost;
      node.position.y += Math.sin(t * 2.2 + idx * 1.1) * 0.0025;
    });

    if (groupRef.current) {
      const targetScale = (hovered ? 1.05 : 0.96) * (1 + Math.sin(burstRef.current * Math.PI) * 0.12);
      const nextScale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta);
      groupRef.current.scale.setScalar(nextScale);

      const pointerX = THREE.MathUtils.clamp(state.pointer.x * 0.35, -0.4, 0.4);
      const pointerY = THREE.MathUtils.clamp(state.pointer.y * 0.25, -0.3, 0.3);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, pointerX, 4, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, -pointerY, 4, delta);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0.25, 0]}
      scale={0.86}
      onClick={(e) => {
        e.stopPropagation();
        burstRef.current = 1.0;
        if (onCoreClick) onCoreClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

export function KnowledgeCore3D({ isOptimized = true, onCoreClick }: KnowledgeCore3DProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 215,
        position: 'relative',
        borderRadius: 16,
        background: 'radial-gradient(circle at 50% 45%, rgba(249, 115, 22, 0.16) 0%, rgba(15, 23, 42, 0.92) 75%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      title="Nhấn vào Lõi 3D OR-Tools để kích hoạt xung nhịp tối ưu!"
    >
      <Canvas
        camera={{ position: [0, 0.15, 6.4], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1.9} color="#fffbf5" />
        <directionalLight position={[5, 8, 6]} intensity={2.8} color="#fff7ed" />
        <directionalLight position={[-6, 2, 5]} intensity={2.0} color="#e0f2fe" />
        <pointLight position={[0, 0, 0]} intensity={2.6} distance={5} color={isOptimized ? '#10b981' : '#ea580c'} />

        <Suspense fallback={null}>
          <Float speed={1.6} rotationIntensity={0.14} floatIntensity={0.18}>
            <KnowledgeCoreAssembly isOptimized={isOptimized} onCoreClick={onCoreClick} />
          </Float>
        </Suspense>

        <OrbitControls enableZoom={false} enablePan={false} dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}

try {
  useGLTF.preload('/models/academic-knowledge-core.glb');
} catch {
  // ignore preload errors in test environments
}
