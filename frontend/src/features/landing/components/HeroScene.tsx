import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, RoundedBox, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { MascotModel, GeometricMascotFallback } from './MascotModel';

interface HeroSceneProps {
  interactive?: boolean;
}

// Generate instant, crisp canvas textures for 3D badges without external font downloads
function useBadgeTexture(text: string, accentColor: string, bgColor: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rounded pill container
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 144, 28);
    } else {
      ctx.fillRect(8, 8, 496, 144);
    }
    ctx.fill();

    // Glowing neon border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 144, 28);
    } else {
      ctx.strokeRect(8, 8, 496, 144);
    }
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [text, accentColor, bgColor]);
}

function FloatingScheduleBadge({
  text,
  accentColor,
  bgColor,
  position,
  rotationIntensity = 0.2,
  speed = 2,
}: {
  text: string;
  accentColor: string;
  bgColor: string;
  position: [number, number, number];
  rotationIntensity?: number;
  speed?: number;
}) {
  const texture = useBadgeTexture(text, accentColor, bgColor);

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <Float speed={speed} rotationIntensity={rotationIntensity} floatIntensity={0.3} position={[0, 0, 0]}>
        <RoundedBox args={[1.1, 0.35, 0.35]} radius={0.06} smoothness={4} castShadow>
          <meshStandardMaterial color="#0c1222" roughness={0.2} metalness={0.4} />
        </RoundedBox>

        {texture && (
          <mesh position={[0, 0, 0.19]}>
            <planeGeometry args={[1.0, 0.31]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
        )}
      </Float>
    </Billboard>
  );
}

// 3D Schedule Badges floating around the Cyber Campus Diorama
function OrbitingScheduleBadges() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.04;
  });

  return (
    <group ref={groupRef}>
      {/* 3D Task Block 1: Database (Left, Cyan Accent) */}
      <FloatingScheduleBadge
        text="09:00 Database · Campus Building A"
        accentColor="#00d4ff"
        bgColor="#070c1a"
        position={[-1.95, 1.25, 0.8]}
        speed={1.8}
      />

      {/* 3D Task Block 2: Machine Learning (Right, FPT Orange Accent) */}
      <FloatingScheduleBadge
        text="11:20 ML Lab · Campus Lab"
        accentColor="#f27024"
        bgColor="#070c1a"
        position={[1.95, 1.35, 0.6]}
        speed={2.2}
      />

      {/* 3D Task Block 3: Optimal Slot (Center Top, Emerald Green Accent) */}
      <FloatingScheduleBadge
        text="✓ 15p Đệm di chuyển an toàn"
        accentColor="#4ade80"
        bgColor="#051410"
        position={[0, 2.05, -1.1]}
        speed={1.5}
      />
    </group>
  );
}

// Smooth camera rig with mouse parallax
function CameraMouseParallax() {
  useFrame((state, delta) => {
    // Parallax damping: smoothly shift camera around focus point [0, 0.65, 0]
    const targetX = 3.2 + state.pointer.x * 0.45;
    const targetY = 2.2 - state.pointer.y * 0.35;
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, targetX, 2.5, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 2.5, delta);
    state.camera.lookAt(0, 0.65, 0);
  });
  return null;
}

function DioramaLoadingFallback() {
  return (
    <group position={[0, 0, 0]}>
      {/* Sleek subtle ground pedestal */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.8, 2.0, 0.1, 48]} />
        <meshStandardMaterial color="#0b1329" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.48, 48]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} />
      </mesh>
      <GeometricMascotFallback scale={1.1} position={[0, 0, 0]} />
    </group>
  );
}

export function HeroScene({ interactive = true }: HeroSceneProps) {
  return (
    <div
      className="full-3d-scene-canvas"
      role="img"
      aria-label="SmartSchedule Full 3D Cyber AI Campus Diorama with Mascot"
    >
      <Canvas
        camera={{ position: [3.2, 2.2, 4.0], fov: 42 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('HeroScene WebGL context loss handled');
          });
        }}
      >
        {/* Deep Cyber Ambient Lighting */}
        <ambientLight intensity={0.9} color="#162036" />

        {/* Studio Key Light: Warm, casts soft shadows */}
        <directionalLight
          position={[5, 7, 4]}
          intensity={1.8}
          color="#fff6ee"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />

        {/* Cyber Neon Cyan Fill Light (from left) */}
        <directionalLight position={[-6, 4, 1]} intensity={1.1} color="#00d4ff" />

        {/* FPT Orange Neon Rim Light (from behind right) */}
        <directionalLight position={[2, 5, -5]} intensity={1.4} color="#f27024" />

        {/* Bottom Uplight Glow */}
        <pointLight position={[0, -0.2, 0]} intensity={0.8} color="#0066ff" distance={5} />

        {/* Mouse Parallax Controller */}
        {interactive && <CameraMouseParallax />}

        <Suspense fallback={<DioramaLoadingFallback />}>
          <group position={[0, 0, 0]}>
            {/* The complete, pristine Blender PBR Diorama (Mascot + Pedestal + Cloud + Lab + PCB) */}
            <MascotModel
              scale={1.15}
              position={[0, 0, 0]}
              rotation={[0, 0.15, 0]}
              floatIntensity={0.6}
              interactive={interactive}
            />

            {/* Orbiting 3D Schedule Badges */}
            <OrbitingScheduleBadges />
          </group>
        </Suspense>

        {/* Drag-to-Rotate 360 Degree Orbit Controls */}
        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3.6}
            maxPolarAngle={Math.PI / 2.05}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
            dampingFactor={0.06}
          />
        )}
      </Canvas>
    </div>
  );
}
