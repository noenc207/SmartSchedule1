import React, { useRef, useMemo, useEffect, Component, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BRAND_ASSETS } from '../assets/brandAssets';

export interface MascotModelProps {
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  floatIntensity?: number;
  interactive?: boolean;
}

export function GeometricMascotFallback({
  scale = 0.85,
  position = [0, -0.1, 0],
}: {
  scale?: number;
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.035;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Head */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshStandardMaterial color="#fffbf5" roughness={0.25} metalness={0.05} />
      </mesh>
      {/* Glossy Visor / Friendly Eyes */}
      <mesh position={[0, 1.06, 0.28]} castShadow>
        <boxGeometry args={[0.32, 0.15, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* FPT Orange Accents / Cap */}
      <mesh position={[0, 1.28, 0.05]} castShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.12, 32]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.65, 32]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Raised Index Finger (Iconic Mascot Pose) */}
      <mesh position={[0.42, 0.95, 0.1]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.25, 16]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Base shadow disc */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#fed7aa" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

class MascotErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.warn('Mascot 3D GLTF load notice, using academic diorama fallback', err);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function RealMascotMesh({
  scale = 1.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  floatIntensity = 1,
  interactive = true,
}: MascotModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(BRAND_ASSETS.mascotModelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Load emissive texture to illuminate glowing cyber accents & pedestal circuit paths
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      BRAND_ASSETS.mascotEmissiveUrl,
      (emissiveTex) => {
        emissiveTex.flipY = false;
        emissiveTex.colorSpace = THREE.SRGBColorSpace;

        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
              mat.emissiveMap = emissiveTex;
              mat.emissive = new THREE.Color(0xffffff);
              mat.emissiveIntensity = 1.2;
              mat.roughness = 0.26;
              mat.metalness = 0.08;
              mat.needsUpdate = true;
              mesh.material = mat;
            }
          }
        });
      },
      undefined,
      () => {
        // Fallback: enable shadows on original materials without emissive
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      }
    );
  }, [clonedScene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Natural idle floating motion
    if (floatIntensity > 0) {
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.035 * floatIntensity;
    }

    // Responsive cursor parallax (strictly front-facing clamped angles)
    if (interactive) {
      const isMobile = state.size.width < 768;
      const targetRotY = isMobile
        ? rotation[1]
        : rotation[1] + THREE.MathUtils.clamp(state.pointer.x * 0.16, -0.20, 0.20);
      const targetRotX = isMobile
        ? rotation[0]
        : rotation[0] - THREE.MathUtils.clamp(state.pointer.y * 0.08, -0.10, 0.10);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3.5, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 3.5, delta);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function MascotModel(props: MascotModelProps) {
  return (
    <MascotErrorBoundary fallback={<GeometricMascotFallback scale={props.scale} position={props.position} />}>
      <RealMascotMesh {...props} />
    </MascotErrorBoundary>
  );
}

// Preload canonical PBR mascot model
try {
  useGLTF.preload(BRAND_ASSETS.mascotModelUrl);
} catch (e) {
  console.warn('Preload mascot skipped', e);
}
