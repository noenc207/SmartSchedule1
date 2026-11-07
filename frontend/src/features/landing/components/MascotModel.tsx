import React, { useRef, useMemo, useEffect, useState, Component, type ReactNode } from 'react';
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
  actionPulse?: number;
  onMascotClick?: () => void;
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
    groupRef.current.position.y = position[1] + Math.sin(t * 2.2) * 0.05;
    groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.15;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshStandardMaterial color="#fffbf5" roughness={0.25} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.06, 0.28]}>
        <boxGeometry args={[0.32, 0.15, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.28, 0.05]}>
        <cylinderGeometry args={[0.34, 0.38, 0.12, 32]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.65, 32]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} metalness={0.1} />
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
  actionPulse = 0,
  onMascotClick,
}: MascotModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(BRAND_ASSETS.mascotModelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Joyful physics state for hop & spin animations
  const jumpProgress = useRef(0);
  const spinAngle = useRef(0);
  const [hovered, setHovered] = useState(false);

  // Trigger celebratory hop when actionPulse increments
  useEffect(() => {
    if (actionPulse > 0) {
      jumpProgress.current = 1.0;
      spinAngle.current += Math.PI * 2;
    }
  }, [actionPulse]);

  useEffect(() => {
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
              mat.emissiveIntensity = 1.45;
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
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      },
    );
  }, [clonedScene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Decay jump impulse smoothly
    if (jumpProgress.current > 0.001) {
      jumpProgress.current = Math.max(0, jumpProgress.current - delta * 2.2);
    } else {
      jumpProgress.current = 0;
    }

    // Joyful parabolic hop height
    const hopOffset = Math.sin(jumpProgress.current * Math.PI) * 0.24;

    // Playful idle bounce + hop
    const idleBounce = Math.sin(time * 2.4) * 0.045 * floatIntensity;
    groupRef.current.position.y = position[1] + idleBounce + hopOffset;

    // Playful side-to-side cheerful sway
    const cheerfulSwayZ = Math.sin(time * 1.8) * 0.03 + Math.sin(jumpProgress.current * Math.PI * 2) * 0.08;
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, cheerfulSwayZ, 5, delta);

    // Interactive scale pop on hover or jump
    const targetScale = scale * (hovered ? 1.06 : 1.0) * (1 + Math.sin(jumpProgress.current * Math.PI) * 0.08);
    const currentScale = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta);
    groupRef.current.scale.setScalar(currentScale);

    // Responsive cursor tracking + celebratory spin
    if (interactive) {
      const isMobile = state.size.width < 768;
      const pointerRotY = isMobile ? 0 : THREE.MathUtils.clamp(state.pointer.x * 0.32, -0.35, 0.35);
      const idleTurnY = Math.sin(time * 0.9) * 0.08;
      const targetRotY = rotation[1] + pointerRotY + idleTurnY + spinAngle.current;

      const pointerRotX = isMobile ? 0 : -THREE.MathUtils.clamp(state.pointer.y * 0.14, -0.16, 0.16);
      const targetRotX = rotation[0] + pointerRotX - Math.sin(jumpProgress.current * Math.PI) * 0.12;

      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 4.2, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 4.2, delta);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    jumpProgress.current = 1.0;
    spinAngle.current += Math.PI * 2;
    if (onMascotClick) onMascotClick();
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
      onClick={handleClick}
      onPointerOver={() => {
        setHovered(true);
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
      }}
    >
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

try {
  useGLTF.preload(BRAND_ASSETS.mascotModelUrl);
} catch (e) {
  console.warn('Preload mascot skipped', e);
}
