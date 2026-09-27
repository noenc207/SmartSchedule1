import React, { useRef, useMemo, useEffect, Component, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BRAND_ASSETS } from '../assets/brandAssets';

interface MascotModelProps {
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  floatIntensity?: number;
  interactive?: boolean;
}

export function GeometricMascotFallback({
  scale = 1.0,
  position = [0, 0, 0],
}: {
  scale?: number;
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.05;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Head */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Glossy Visor / Eyes */}
      <mesh position={[0, 1.06, 0.28]} castShadow>
        <boxGeometry args={[0.32, 0.15, 0.1]} />
        <meshStandardMaterial color="#050814" roughness={0.08} metalness={0.9} />
      </mesh>
      {/* FPT Orange Ears / Accents */}
      <mesh position={[-0.22, 1.36, 0]} rotation={[0, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 0.24, 16]} />
        <meshStandardMaterial color="#f27024" roughness={0.25} metalness={0.2} />
      </mesh>
      <mesh position={[0.22, 1.36, 0]} rotation={[0, 0, 0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 0.24, 16]} />
        <meshStandardMaterial color="#f27024" roughness={0.25} metalness={0.2} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.65, 32]} />
        <meshStandardMaterial color="#f27024" roughness={0.25} metalness={0.2} />
      </mesh>
      {/* Chest Logo Emblem */}
      <mesh position={[0, 0.55, 0.31]}>
        <boxGeometry args={[0.16, 0.08, 0.02]} />
        <meshStandardMaterial color="#0047ba" roughness={0.3} />
      </mesh>
      {/* Base shadow disc */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#050814" transparent opacity={0.4} />
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
    console.warn('Mascot 3D GLTF load warning, displaying geometric diorama fallback', err);
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
    // Load the 2048x2048 emissive texture to give the mascot glowing neon accents
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
              mat.emissiveIntensity = 1.6;
              // Glossy PBR surface matching official 3D art
              mat.roughness = 0.22;
              mat.metalness = 0.12;
              mat.needsUpdate = true;
              mesh.material = mat;
            }
          }
        });
      },
      undefined,
      () => {
        // Fallback: enable shadows on basic material
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

    // Smooth idle float and breathing
    if (floatIntensity > 0) {
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.05 * floatIntensity;
      groupRef.current.rotation.y = rotation[1] + Math.sin(time * 0.8) * 0.03 * floatIntensity;
    }

    // Interactive cursor tracking parallax
    if (interactive) {
      const targetRotY = rotation[1] + state.pointer.x * 0.22;
      const targetRotX = rotation[0] - state.pointer.y * 0.10;
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 3, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 3, delta);
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

// Preload the canonical PBR mascot model
try {
  useGLTF.preload(BRAND_ASSETS.mascotModelUrl);
} catch (e) {
  console.warn('Preload mascot skipped', e);
}
