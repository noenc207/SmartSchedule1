import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import { MascotModel, GeometricMascotFallback } from './MascotModel';

export interface HeroSceneProps {
  interactive?: boolean;
  actionPulse?: number;
  activeMode?: number;
  onMascotClick?: () => void;
}

// 1. Playful Floating 3D Stardust & Energy Particles
function PlayfulStarfield({ activeMode = 0 }: { activeMode?: number }) {
  const starsRef = useRef<THREE.Points>(null);

  const [starPositions, starColors] = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#ff7a32'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#34d399'),
      new THREE.Color('#fde047'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.4 + Math.random() * 6.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 0.4;
      positions[i * 3 + 2] = r * Math.cos(phi) - 1.5;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (!starsRef.current) return;
    const t = state.clock.getElapsedTime();
    starsRef.current.rotation.y = t * (0.04 + activeMode * 0.015);
    starsRef.current.position.y = Math.sin(t * 0.8) * 0.06;
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.88}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// 2. Base Pedestal Energy Rings & Orbiting 3D Academic Gems (Positioned low so they NEVER cross the mascot's face)
function PlayfulOrbitalStage({ activeMode = 0, actionPulse = 0 }: { activeMode?: number; actionPulse?: number }) {
  const orbitGroupRef = useRef<THREE.Group>(null);
  const gem1Ref = useRef<THREE.Mesh>(null);
  const gem2Ref = useRef<THREE.Mesh>(null);
  const gem3Ref = useRef<THREE.Mesh>(null);

  const modeColor = activeMode === 0 ? '#f97316' : activeMode === 1 ? '#38bdf8' : '#10b981';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speedMultiplier = 1 + (actionPulse % 3) * 0.25;

    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y = t * 0.45 * speedMultiplier;
    }

    if (gem1Ref.current) {
      gem1Ref.current.rotation.x = t * 1.8;
      gem1Ref.current.rotation.y = t * 2.2;
      gem1Ref.current.position.y = 0.35 + Math.sin(t * 2.5) * 0.12;
    }
    if (gem2Ref.current) {
      gem2Ref.current.rotation.x = -t * 1.6;
      gem2Ref.current.rotation.z = t * 2.0;
      gem2Ref.current.position.y = 0.55 + Math.cos(t * 2.2) * 0.12;
    }
    if (gem3Ref.current) {
      gem3Ref.current.rotation.y = t * 2.4;
      gem3Ref.current.position.y = 0.45 + Math.sin(t * 2.8 + 1.5) * 0.12;
    }
  });

  return (
    <group position={[0, -0.26, 0]}>
      {/* Ground Glowing Halo Ring (Flat around pedestal base) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.18, 1.26, 64]} />
        <meshBasicMaterial color={modeColor} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.38, 1.41, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Orbiting 3D Gems around the Mascot (Outer radius 1.45 so they frame the mascot playfully) */}
      <group ref={orbitGroupRef}>
        {/* Gem 1: FPT Orange Octahedron (6 Slots) */}
        <mesh ref={gem1Ref} position={[1.42, 0.35, 0.2]}>
          <octahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={0.65}
            roughness={0.15}
            metalness={0.3}
          />
        </mesh>

        {/* Gem 2: AI Campus Cyan Icosahedron (Alpha-Beta Routing) */}
        <mesh ref={gem2Ref} position={[-1.38, 0.55, 0.35]}>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.65}
            roughness={0.15}
            metalness={0.3}
          />
        </mesh>

        {/* Gem 3: Emerald Focus Torus (OR-Tools CP-SAT) */}
        <mesh ref={gem3Ref} position={[0, 0.45, -1.35]}>
          <torusGeometry args={[0.09, 0.032, 16, 32]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#059669"
            emissiveIntensity={0.65}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

// 3. Camera Smooth Mouse Parallax (Framed to show 100% of Mascot + Pedestal)
function CameraMouseRig({ interactive }: { interactive: boolean }) {
  useFrame((state, delta) => {
    const isMobile = state.size.width < 768;
    const targetX = interactive && !isMobile ? state.pointer.x * 0.24 : 0;
    const targetY = 0.62 + (interactive && !isMobile ? -state.pointer.y * 0.12 : 0);

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, targetX, 3.2, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 3.2, delta);
    state.camera.lookAt(0, 0.42, 0);
  });
  return null;
}

export function HeroScene({
  interactive = true,
  actionPulse = 0,
  activeMode = 0,
  onMascotClick,
}: HeroSceneProps) {
  return (
    <div
      className="hero-3d-scene-container"
      role="img"
      aria-label="Mô hình 3D Cóc Trợ Lý AI tương tác trực tiếp cùng hệ quỹ đạo học thuật FPTU"
      style={{ width: '100%', height: '100%', minHeight: '220px', position: 'relative' }}
    >
      <Canvas
        camera={{ position: [0, 0.62, 3.35], fov: 38 }}
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.45,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
          });
        }}
      >
        {/* Bright Studio & Warm Hemisphere Lighting so PBR Mascot looks vivid & friendly */}
        <hemisphereLight args={['#ffffff', '#fed7aa', 1.9]} />
        <ambientLight intensity={1.35} color="#fff7ed" />

        {/* Frontal-Right Studio Key Light */}
        <directionalLight
          position={[2.8, 4.5, 4.5]}
          intensity={3.0}
          color="#fffaf0"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />

        {/* Frontal-Left Soft Fill Light */}
        <directionalLight position={[-3.2, 3.0, 3.5]} intensity={2.1} color="#e0f2fe" />

        {/* Warm FPT Orange Rim & Uplight */}
        <directionalLight position={[2.0, 3.0, -3.0]} intensity={2.8} color="#ff7a32" />
        <pointLight position={[0, 0.8, 2.2]} intensity={1.6} color="#ffedd5" distance={6} />

        <CameraMouseRig interactive={interactive} />

        <PlayfulStarfield activeMode={activeMode} />
        <PlayfulOrbitalStage activeMode={activeMode} actionPulse={actionPulse} />

        <Suspense fallback={<GeometricMascotFallback scale={0.85} position={[0, -0.2, 0]} />}>
          <Float speed={1.8} rotationIntensity={0.04} floatIntensity={0.18}>
            <MascotModel
              scale={0.96}
              position={[0, -0.24, 0]}
              rotation={[0, 0, 0]}
              floatIntensity={0.9}
              interactive={interactive}
              actionPulse={actionPulse}
              onMascotClick={onMascotClick}
            />
          </Float>
        </Suspense>

        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 2.05}
            dampingFactor={0.06}
          />
        )}
      </Canvas>
    </div>
  );
}
