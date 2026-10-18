import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, RoundedBox, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { MascotModel, GeometricMascotFallback } from './MascotModel';

interface HeroSceneProps {
  interactive?: boolean;
}

// 1. Procedural Radial Nebula Texture for volumetric space clouds
function useNebulaTexture(colorCenter: string, colorMid: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, colorCenter);
    grad.addColorStop(0.45, colorMid);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [colorCenter, colorMid]);
}

// 2. Multi-layer Cosmic Starfield (High performance BufferGeometry)
function CosmicStarfield() {
  const starsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);

  // Distant twinkling stars
  const [starPositions, starColors] = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#9de7ff'), // Ice blue
      new THREE.Color('#f8faff'), // Starlight white
      new THREE.Color('#ffc46b'), // Warm amber
      new THREE.Color('#6557b8'), // Nebula violet
    ];

    for (let i = 0; i < count; i++) {
      // Distribute in a spherical shell behind and around scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 6 + Math.random() * 12;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 2; // push slightly back

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return [positions, colors];
  }, []);

  // Near floating stardust
  const dustPositions = useMemo(() => {
    const count = 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return pos;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scrollOffset = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollProgress = THREE.MathUtils.clamp(scrollOffset / 900, 0, 1);

    if (starsRef.current) {
      starsRef.current.rotation.y = t * 0.015;
      starsRef.current.rotation.x = Math.sin(t * 0.008) * 0.02;
      // Distant stars move with subtle slow upward drift
      starsRef.current.position.y = scrollProgress * 0.18;
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = -t * 0.025;
      // Near stardust shifts with greater depth amplitude
      dustRef.current.position.y = Math.sin(t * 0.3) * 0.05 - scrollProgress * 0.35;
    }
  });

  return (
    <group>
      {/* Background Starfield */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Near Floating Stardust */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#ffc46b"
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// 3. Volumetric Procedural Nebula Clouds
function CosmicNebula() {
  const groupRef = useRef<THREE.Group>(null);
  const violetTex = useNebulaTexture('rgba(101, 87, 184, 0.45)', 'rgba(38, 63, 120, 0.25)');
  const orangeTex = useNebulaTexture('rgba(234, 88, 12, 0.40)', 'rgba(255, 122, 50, 0.18)');
  const blueTex = useNebulaTexture('rgba(38, 63, 120, 0.50)', 'rgba(8, 11, 26, 0.15)');

  useFrame(() => {
    if (!groupRef.current) return;
    const scrollOffset = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollProgress = THREE.MathUtils.clamp(scrollOffset / 900, 0, 1);
    groupRef.current.position.y = 0.6 - scrollProgress * 0.22;
  });

  return (
    <group ref={groupRef} position={[0, 0.6, -2.5]}>
      {/* Violet Nebula (Left-Rear) */}
      {violetTex && (
        <mesh position={[-1.8, 0.8, -0.5]}>
          <planeGeometry args={[5.5, 4.5]} />
          <meshBasicMaterial map={violetTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* Radiant Orange Core (Behind Mascot) */}
      {orangeTex && (
        <mesh position={[0.6, 0.4, -0.8]}>
          <planeGeometry args={[4.8, 4.0]} />
          <meshBasicMaterial map={orangeTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* Cosmic Deep Blue Aura (Lower-Center) */}
      {blueTex && (
        <mesh position={[0, -0.6, -0.3]}>
          <planeGeometry args={[6.0, 3.5]} />
          <meshBasicMaterial map={blueTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// 4. Cosmic Orbital Ring with Traveling Light Pulses
function CosmicOrbitalRings() {
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const node1Ref = useRef<THREE.Mesh>(null);
  const node2Ref = useRef<THREE.Mesh>(null);
  const node3Ref = useRef<THREE.Mesh>(null);

  // Generate 3D ellipse points for orbital path
  const [ring1Geo, ring2Geo] = useMemo(() => {
    const points1: THREE.Vector3[] = [];
    const points2: THREE.Vector3[] = [];
    const segments = 96;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // Ellipse 1: Orange academic trajectory
      points1.push(new THREE.Vector3(Math.cos(theta) * 1.55, 0, Math.sin(theta) * 1.15));
      // Ellipse 2: Ice blue AI campus orbit
      points2.push(new THREE.Vector3(Math.cos(theta) * 1.85, 0, Math.sin(theta) * 1.35));
    }

    const g1 = new THREE.BufferGeometry().setFromPoints(points1);
    const g2 = new THREE.BufferGeometry().setFromPoints(points2);
    return [g1, g2];
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scrollOffset = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollProgress = THREE.MathUtils.clamp(scrollOffset / 900, 0, 1);

    // Node 1: Glides along Ring 1 (FPT Orange pulse)
    if (node1Ref.current) {
      const angle = t * 0.85;
      node1Ref.current.position.set(Math.cos(angle) * 1.55, 0, Math.sin(angle) * 1.15);
    }

    // Node 2: Glides along Ring 1 offset
    if (node2Ref.current) {
      const angle = t * 0.85 + Math.PI;
      node2Ref.current.position.set(Math.cos(angle) * 1.55, 0, Math.sin(angle) * 1.15);
    }

    // Node 3: Glides along Ring 2 (Ice Blue pulse)
    if (node3Ref.current) {
      const angle = -t * 0.65;
      node3Ref.current.position.set(Math.cos(angle) * 1.85, 0, Math.sin(angle) * 1.35);
    }

    // Gentle global precession + subtle scroll tilt
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = t * 0.04;
      ring1Ref.current.rotation.x = 0.42 + scrollProgress * 0.08;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.03;
      ring2Ref.current.rotation.x = -0.35 - scrollProgress * 0.06;
    }
  });

  return (
    <group position={[0, 0.45, 0]}>
      {/* Orbital Ring 1: Tilted FPT Orange Orbit */}
      <group ref={ring1Ref} rotation={[0.42, 0.2, -0.3]}>
        <lineLoop geometry={ring1Geo}>
          <lineBasicMaterial color="#ea580c" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
        </lineLoop>

        {/* Traveling Energy Pulse Node 1 */}
        <mesh ref={node1Ref}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color="#ff7a32" />
          <pointLight color="#ff7a32" intensity={0.6} distance={1.2} />
        </mesh>

        {/* Traveling Energy Pulse Node 2 */}
        <mesh ref={node2Ref}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color="#ffc46b" />
        </mesh>
      </group>

      {/* Orbital Ring 2: Counter-Tilted Ice Blue Orbit */}
      <group ref={ring2Ref} rotation={[-0.35, -0.3, 0.4]}>
        <lineLoop geometry={ring2Geo}>
          <lineBasicMaterial color="#9de7ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </lineLoop>

        {/* Traveling Energy Pulse Node 3 */}
        <mesh ref={node3Ref}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#9de7ff" />
          <pointLight color="#9de7ff" intensity={0.5} distance={1.2} />
        </mesh>
      </group>
    </group>
  );
}

// 5. Crisp Cosmic 3D Status Pill
function useCosmicBadgeTexture(text: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 680;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark cosmic glass pill container
    ctx.fillStyle = 'rgba(12, 18, 38, 0.92)';
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 664, 124, 28);
    } else {
      ctx.fillRect(8, 8, 664, 124);
    }
    ctx.fill();

    // Glowing border (Ice Blue to FPT Orange)
    ctx.strokeStyle = '#9de7ff';
    ctx.lineWidth = 5;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 664, 124, 28);
    } else {
      ctx.strokeRect(8, 8, 664, 124);
    }
    ctx.stroke();

    // Text label in high-contrast warm white & amber
    ctx.fillStyle = '#f8faff';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 340, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [text]);
}

function CosmicFloatingBadge({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useCosmicBadgeTexture(text);

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.2} position={[0, 0, 0]}>
        <RoundedBox args={[1.32, 0.28, 0.05]} radius={0.05} smoothness={4} castShadow>
          <meshStandardMaterial color="#0c1226" roughness={0.3} metalness={0.7} />
        </RoundedBox>

        {texture && (
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.28, 0.25]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
        )}
      </Float>
    </Billboard>
  );
}

// 6. Camera Parallax & Scroll Depth Controller
function CameraScrollAndMouseParallax({ interactive }: { interactive: boolean }) {
  useFrame((state, delta) => {
    const isMobile = state.size.width < 768;
    const scrollOffset = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollProgress = THREE.MathUtils.clamp(scrollOffset / 900, 0, 1);

    // Mouse pointer target (attenuated or disabled on mobile touch devices)
    const targetX = interactive && !isMobile ? state.pointer.x * 0.22 : 0;
    const scrollCameraY = scrollProgress * 0.22;
    const pointerY = interactive && !isMobile ? state.pointer.y * 0.14 : 0;
    const targetY = 0.72 + scrollCameraY - pointerY;

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, targetX, 2.5, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetY, 2.5, delta);

    // Dynamic focal point: keeps mascot centered without clipping
    const lookAtY = 0.65 - scrollProgress * 0.08;
    state.camera.lookAt(0, lookAtY, 0);
  });
  return null;
}

// 7. Mascot Interactive Stage with Scroll Counter-Parallax
function MascotStageGroup({ interactive }: { interactive: boolean }) {
  const stageRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!stageRef.current) return;
    const scrollOffset = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollProgress = THREE.MathUtils.clamp(scrollOffset / 900, 0, 1);

    // Subtle counter-depth: as viewport scrolls down, mascot remains anchored in 3D space
    const targetY = -0.05 - scrollProgress * 0.24;
    const targetRotX = scrollProgress * 0.06;

    stageRef.current.position.y = THREE.MathUtils.damp(stageRef.current.position.y, targetY, 3.8, delta);
    stageRef.current.rotation.x = THREE.MathUtils.damp(stageRef.current.rotation.x, targetRotX, 3.8, delta);
  });

  return (
    <group ref={stageRef} position={[0, -0.05, 0]}>
      {/* Dark Cosmic Ground Disc */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.25, 1.35, 0.04, 64]} />
        <meshStandardMaterial color="#0c1226" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.26, 1.32, 64]} />
        <meshBasicMaterial color="#ea580c" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* The Canonical 3D PBR Mascot Model: STRICTLY FRONT-FACING at rotation [0, 0, 0] */}
      <MascotModel
        scale={1.22}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        floatIntensity={0.8}
        interactive={interactive}
      />

      {/* Floating Status Pill: Clear Space Above Mascot */}
      <CosmicFloatingBadge
        text="✓ Chuẩn 6 Slot FPTU · Đệm an toàn 15p"
        position={[0, 1.72, 0.1]}
      />
    </group>
  );
}

// 8. Loading Fallback
function CosmicLoadingFallback() {
  return (
    <group position={[0, -0.05, 0]}>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.04, 32]} />
        <meshStandardMaterial color="#111a3a" roughness={0.4} metalness={0.5} />
      </mesh>
      <GeometricMascotFallback scale={0.85} position={[0, -0.1, 0]} />
    </group>
  );
}

export function HeroScene({ interactive = true }: HeroSceneProps) {
  return (
    <div
      className="hero-3d-scene-container"
      role="img"
      aria-label="Tượng Mascot 3D Cóc AI SmartSchedule nổi bật giữa không gian vũ trụ cùng quỹ đạo thời khóa biểu"
      style={{ width: '100%', height: '100%', minHeight: '480px', position: 'relative' }}
    >
      <Canvas
        camera={{ position: [0, 0.72, 2.75], fov: 42 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('HeroScene WebGL context lost handled');
          });
        }}
      >
        {/* Deep Midnight Ambient Lighting */}
        <ambientLight intensity={0.9} color="#111a3a" />

        {/* Studio Key Light: Crisp Starlight White */}
        <directionalLight
          position={[3, 5, 4]}
          intensity={2.4}
          color="#f8faff"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />

        {/* Warm FPT Orange Rim Light (From Rear-Right) */}
        <directionalLight position={[2.5, 3.5, -3]} intensity={3.2} color="#ff7a32" />

        {/* Ice Blue Contrast Rim Light (From Rear-Left) */}
        <directionalLight position={[-3, 2.5, -2]} intensity={2.2} color="#9de7ff" />

        {/* Pedestal Cyber Uplight */}
        <pointLight position={[0, -0.2, 0]} intensity={1.6} color="#ea580c" distance={4.5} />

        {/* Camera Parallax & Scroll Depth */}
        <CameraScrollAndMouseParallax interactive={interactive} />

        {/* Cosmic Starfield & Nebula Environment */}
        <CosmicStarfield />
        <CosmicNebula />
        <CosmicOrbitalRings />

        <Suspense fallback={<CosmicLoadingFallback />}>
          <MascotStageGroup interactive={interactive} />
        </Suspense>

        {/* Smooth OrbitControls: Clamped so Mascot Never Turns Back */}
        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minAzimuthAngle={-Math.PI / 5}
            maxAzimuthAngle={Math.PI / 5}
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 2.05}
            dampingFactor={0.06}
          />
        )}
      </Canvas>
    </div>
  );
}
