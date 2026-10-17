import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';
import ShinyText from '../../components/ShinyText';
import { BorderBeam } from '../../components/ui/border-beam';
import {
  SoftBlurInText,
  ShimmerSweepBadge,
  PerCharacterRiseText,
  ANIMATE_TEXT_EASINGS,
} from '../../components/effects/AnimateText';

// Static asset imports from curated local library
import gridPattern from '../../assets/ui/heropattern-architectural-grid.svg';
import auroraGlow from '../../assets/ui/haikei-subtle-aurora-glow.svg';
import crystalAnimWebp from '../../assets/ui/anim-3d-crystal-polyhedron.webp';

interface AuthVisual3DProps {
  mode?: 'login' | 'register';
  className?: string;
}

/**
 * Enhanced 3D Knowledge Core Assembly
 *
 * Visual Improvements (Visual Polish V2):
 * - ~25% scaled up central geometry (1.12 scale vs 0.88 previously)
 * - Independent multi-axis rotation and varied speeds for all 3 orbital rings
 * - Custom PBR material enhancement (lacquered crystal orange core, metallic copper/champagne orbital bands)
 * - Harmonic micro-floating oscillation for schedule nodes
 * - Procedural purposeful geometric satellites (octahedron, dodecahedron, tetrahedron)
 * - Extra fine champagne outer orbit ring
 * - Smooth pointer parallax tilt with velocity dampening
 */
function KnowledgeCoreModel({ mousePos }: { mousePos: React.MutableRefObject<{ x: number; y: number }> }) {
  const gltf = useGLTF('/models/academic-knowledge-core.glb');
  const groupRef = useRef<THREE.Group>(null);
  const ringPrimaryRef = useRef<THREE.Object3D | null>(null);
  const ringSecondaryRef = useRef<THREE.Object3D | null>(null);
  const ringHorizonRef = useRef<THREE.Object3D | null>(null);
  const prismCoreRef = useRef<THREE.Object3D | null>(null);
  const innerLuminaryRef = useRef<THREE.Object3D | null>(null);
  const nodesRef = useRef<THREE.Object3D[]>([]);

  // Procedural satellite & accent ring refs
  const sat1Ref = useRef<THREE.Mesh>(null);
  const sat2Ref = useRef<THREE.Mesh>(null);
  const sat3Ref = useRef<THREE.Mesh>(null);
  const extraOrbitRef = useRef<THREE.Mesh>(null);

  // Material tuning & node cache on model load
  useEffect(() => {
    if (!gltf.scene) return;

    ringPrimaryRef.current = gltf.scene.getObjectByName('OrbitalRingPrimary') || null;
    ringSecondaryRef.current = gltf.scene.getObjectByName('OrbitalRingSecondary') || null;
    ringHorizonRef.current = gltf.scene.getObjectByName('OrbitalRingHorizon') || null;
    prismCoreRef.current = gltf.scene.getObjectByName('PrismCore') || null;
    innerLuminaryRef.current = gltf.scene.getObjectByName('InnerLuminary') || null;

    const nodes: THREE.Object3D[] = [];
    for (let i = 1; i <= 6; i++) {
      const node = gltf.scene.getObjectByName(`ScheduleNode_${i}`);
      if (node) nodes.push(node);
    }
    nodesRef.current = nodes;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();

          if (child.name === 'PrismCore') {
            // Radiant FPTU Orange crystal with warm inner luminosity — no dark brown or muddy shadow holes
            mat.color = new THREE.Color('#f97316');
            mat.roughness = 0.16;
            mat.metalness = 0.08;
            mat.emissive = new THREE.Color('#ea580c');
            mat.emissiveIntensity = 0.45;
          } else if (child.name === 'InnerLuminary') {
            // Internal warm radiant nucleus
            mat.color = new THREE.Color('#fef08a');
            mat.roughness = 0.05;
            mat.metalness = 0.0;
            mat.emissive = new THREE.Color('#fde047');
            mat.emissiveIntensity = 1.3;
          } else if (child.name === 'OrbitalRingPrimary') {
            // Metallic warm copper-orange orbital band
            mat.color = new THREE.Color('#ea580c');
            mat.roughness = 0.18;
            mat.metalness = 0.42;
            mat.emissive = new THREE.Color('#c2410c');
            mat.emissiveIntensity = 0.25;
          } else if (child.name === 'OrbitalRingSecondary') {
            // Champagne gold orbit band
            mat.color = new THREE.Color('#fbbf24');
            mat.roughness = 0.15;
            mat.metalness = 0.46;
            mat.emissive = new THREE.Color('#d97706');
            mat.emissiveIntensity = 0.22;
          } else if (child.name === 'OrbitalRingHorizon') {
            // Luminous golden peach equator band
            mat.color = new THREE.Color('#fba758');
            mat.roughness = 0.20;
            mat.metalness = 0.32;
            mat.emissive = new THREE.Color('#ea580c');
            mat.emissiveIntensity = 0.20;
          } else if (child.name.startsWith('ScheduleNode')) {
            // Academic calendar tokens (bright warm amber)
            mat.color = new THREE.Color('#fde047');
            mat.roughness = 0.15;
            mat.metalness = 0.32;
            mat.emissive = new THREE.Color('#f59e0b');
            mat.emissiveIntensity = 0.35;
          }
          mesh.material = mat;
        }
      }
    });
  }, [gltf]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // 1. Independent rotation for the 3 distinct orbital rings
    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), delta * 0.30);
    }
    if (ringSecondaryRef.current) {
      ringSecondaryRef.current.rotateOnAxis(new THREE.Vector3(0, 1, 0), -delta * 0.24);
    }
    if (ringHorizonRef.current) {
      ringHorizonRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), delta * 0.14);
    }

    // 2. Central Prism Core continuous rotation + gentle floating
    if (prismCoreRef.current) {
      prismCoreRef.current.rotation.y += delta * 0.18;
      prismCoreRef.current.position.y = Math.sin(time * 1.5) * 0.03;
    }
    if (innerLuminaryRef.current) {
      innerLuminaryRef.current.position.y = Math.sin(time * 1.5) * 0.03;
    }

    // 3. Harmonic micro-floating oscillation for schedule nodes
    nodesRef.current.forEach((node, i) => {
      node.position.y += Math.sin(time * 2.2 + i * 1.1) * 0.0015;
    });

    // 4. Procedural satellites along safe orbital arcs (no viewport clipping)
    if (sat1Ref.current) {
      const angle = time * 0.40;
      sat1Ref.current.position.set(Math.cos(angle) * 1.95, Math.sin(angle) * 0.70, Math.sin(angle) * 1.60);
      sat1Ref.current.rotation.x += delta * 0.7;
      sat1Ref.current.rotation.y += delta * 0.5;
    }
    if (sat2Ref.current) {
      const angle = -time * 0.32 + 2.2;
      sat2Ref.current.position.set(Math.sin(angle) * 2.05, Math.cos(angle * 0.9) * 0.85, Math.cos(angle) * 1.70);
      sat2Ref.current.rotation.y += delta * 0.6;
      sat2Ref.current.rotation.z += delta * 0.5;
    }
    if (sat3Ref.current) {
      const angle = time * 0.26 + 4.1;
      sat3Ref.current.position.set(Math.cos(angle) * 1.80, Math.sin(angle * 1.2) * 0.95, Math.sin(angle) * 1.40);
      sat3Ref.current.rotation.x -= delta * 0.5;
      sat3Ref.current.rotation.z += delta * 0.6;
    }

    // Extra outer fine orbit ring rotation
    if (extraOrbitRef.current) {
      extraOrbitRef.current.rotation.z += delta * 0.08;
    }

    // 5. Smooth pointer parallax tilt with velocity decay to zero equilibrium
    if (groupRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
      const targetRotX = isMobile ? 0 : mousePos.current.y * 0.20;
      const targetRotY = isMobile ? 0 : mousePos.current.x * 0.28;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2.4);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2.4);
      groupRef.current.position.y = Math.sin(time * 1.1) * 0.03;
    }
  });

  return (
    <group ref={groupRef} scale={[1.02, 1.02, 1.02]}>
      {/* Real GLB model with enhanced materials */}
      <primitive object={gltf.scene} />

      {/* Extra outer fine accent orbit (safe radius 2.10) */}
      <mesh ref={extraOrbitRef} rotation={[Math.PI / 3.5, Math.PI / 8, 0]}>
        <torusGeometry args={[2.10, 0.012, 16, 96]} />
        <meshStandardMaterial
          color="#fde68a"
          metalness={0.48}
          roughness={0.18}
          emissive="#f59e0b"
          emissiveIntensity={0.28}
        />
      </mesh>

      {/* Satellite 1: Octahedral node (PLAN milestone) */}
      <mesh ref={sat1Ref}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial
          color="#fde047"
          metalness={0.45}
          roughness={0.18}
          emissive="#f59e0b"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Satellite 2: Dodecahedral node (OPTIMIZE milestone) */}
      <mesh ref={sat2Ref}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color="#f97316"
          metalness={0.35}
          roughness={0.20}
          emissive="#ea580c"
          emissiveIntensity={0.40}
        />
      </mesh>

      {/* Satellite 3: Crystalline prism node (SCHEDULE milestone) */}
      <mesh ref={sat3Ref}>
        <tetrahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color="#fed7aa"
          metalness={0.38}
          roughness={0.20}
          emissive="#fb923c"
          emissiveIntensity={0.30}
        />
      </mesh>
    </group>
  );
}

// Procedural fallback 3D mesh if GLB fails to load or during suspense
function ProceduralFallbackMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.6;
    meshRef.current.rotation.x += delta * 0.3;
  });

  return (
    <mesh ref={meshRef} scale={[1.12, 1.12, 1.12]}>
      <icosahedronGeometry args={[1.3, 0]} />
      <meshStandardMaterial
        color="#ea580c"
        roughness={0.16}
        metalness={0.28}
        emissive="#9a3412"
        emissiveIntensity={0.45}
        flatShading={true}
      />
    </mesh>
  );
}

/**
 * WebGL Capability Detection
 */
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * AuthVisual3D — SmartSchedule Academic 3D Hero (Visual Polish V2)
 *
 * Art Direction: "Premium Academic SaaS × Immersive 3D × FPTU Orange"
 *
 * Visual Improvements:
 * 1. Scaled up central 3D assembly (~25% larger, richer presence)
 * 2. Multi-point atmospheric lighting & natural falloff
 * 3. Concentric architectural coordinate rings in background
 * 4. Ambient floating dust motes (CSS micro-particles)
 * 5. Typographic milestone chips (PLAN, OPTIMIZE, SCHEDULE)
 * 6. Refined bottom telemetry cards with frosted glass & smooth hover
 *
 * Strict Zero-Icon Compliance:
 * - 0 SVG icons, 0 Lucide, 0 emoji. 100% typography, architecture, and lighting.
 */
export function AuthVisual3D({ mode = 'login', className = '' }: AuthVisual3DProps) {
  const heroRef = useRef<HTMLElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [hasWebGL, setHasWebGL] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mousePos.current = { x, y };
  };

  const handleMouseLeave = () => {
    // Graceful velocity decay back to level resting position
    mousePos.current = { x: 0, y: 0 };
  };

  const showInteractive3D = hasWebGL && !isReducedMotion && isTabVisible;

  return (
    <aside
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`auth-visual-hero auth-3d-visual-container ${className}`}
      aria-label="3D Academic Visualization"
      style={{
        backgroundImage: `url(${auroraGlow}), url(${gridPattern})`,
        backgroundRepeat: 'no-repeat, repeat',
        backgroundPosition: 'center top, center center',
        backgroundSize: '100% 70%, 32px 32px',
      }}
    >
      {/* Background Ambience Layers (Luminous Warm Ivory & Radiant Peach Galaxy) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Soft FPTU Orange & Warm Ivory Radial Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.35) 0%, rgba(255, 237, 213, 0.20) 45%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-8 right-12 w-[320px] h-[320px] rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.30) 0%, transparent 68%)',
          }}
        />
      </div>

      {/* Top Header Information & Campus Branding (Zero-Icon) */}
      <header className="relative z-10 flex flex-col">
        <ShimmerSweepBadge className="auth-3d-badge-pill" delay={0}>
          <span className="auth-3d-badge-dot" />
          <span className="auth-3d-badge-text">
            FPT UNIVERSITY QUY NHƠN · AI CAMPUS
          </span>
        </ShimmerSweepBadge>

        <h2 className="auth-3d-hero-title">
          {mode === 'login' ? (
            <>
              <SoftBlurInText
                text="Intelligent Academic"
                delay={0.18}
                as="div"
                className="block"
              />
              <SoftBlurInText
                text="Knowledge Core"
                delay={0.42}
                highlight
                as="div"
                className="block font-black"
              />
            </>
          ) : (
            <>
              <SoftBlurInText
                text="Initialize Your"
                delay={0.18}
                as="div"
                className="block"
              />
              <SoftBlurInText
                text="Academic Odyssey"
                delay={0.42}
                highlight
                as="div"
                className="block font-black"
              />
            </>
          )}
        </h2>

        <motion.p
          className="auth-3d-hero-desc"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.65,
            delay: 0.58,
            ease: ANIMATE_TEXT_EASINGS.softBlurIn,
          }}
        >
          Constraint satisfaction engine reconciling lectures, capstone slots, and study blocks into harmonic reality.
        </motion.p>
      </header>

      {/* Centerpiece: Real 3D WebGL Canvas with Depth Overlays */}
      <div className="auth-3d-canvas-wrapper">
        {/* Layered Warm Ambient Aura */}
        <div className="auth-3d-canvas-aura" aria-hidden="true" />

        {/* Concentric Architectural Coordinate Rings */}
        <div className="auth-3d-coordinate-rings" aria-hidden="true">
          <div className="auth-coord-ring auth-coord-ring-1" />
          <div className="auth-coord-ring auth-coord-ring-2" />
          <div className="auth-coord-ring auth-coord-ring-3" />
        </div>

        {/* Sparse Ambient Motes (CSS Micro-Particles) */}
        <div className="auth-ambient-motes-layer" aria-hidden="true">
          <span className="auth-ambient-mote auth-mote-1" />
          <span className="auth-ambient-mote auth-mote-2" />
          <span className="auth-ambient-mote auth-mote-3" />
          <span className="auth-ambient-mote auth-mote-4" />
          <span className="auth-ambient-mote auth-mote-5" />
          <span className="auth-ambient-mote auth-mote-6" />
        </div>

        {/* Typographic Milestone Chips Anchored Around 3D Orbits (Zero-Icon) */}
        <div className="auth-orbit-milestone auth-milestone-plan">
          <span className="auth-milestone-dot" />
          <span className="auth-milestone-text">
            <PerCharacterRiseText text="PLAN" delay={0.75} />
          </span>
          <span className="auth-milestone-sub">DECONSTRUCT</span>
        </div>

        <div className="auth-orbit-milestone auth-milestone-optimize">
          <span className="auth-milestone-dot" />
          <span className="auth-milestone-text">
            <PerCharacterRiseText text="OPTIMIZE" delay={0.9} />
          </span>
          <span className="auth-milestone-sub">SOLVE</span>
        </div>

        <div className="auth-orbit-milestone auth-milestone-schedule">
          <span className="auth-milestone-dot" />
          <span className="auth-milestone-text">
            <PerCharacterRiseText text="SCHEDULE" delay={1.05} />
          </span>
          <span className="auth-milestone-sub">HARMONIZE</span>
        </div>

        {showInteractive3D ? (
          <div style={{ width: '100%', height: '100%', maxWidth: '640px', position: 'relative' }}>
            <Canvas
              camera={{ position: [0, 0, 6.7], fov: 38 }}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
              {/* Layered Multi-Source Lighting: Bright, Fresh, Luminous Academic Atmosphere */}
              <ambientLight intensity={1.9} color="#fffbf5" />
              <directionalLight position={[5, 8, 6]} intensity={2.6} color="#fff7ed" />
              <directionalLight position={[-6, 2, 5]} intensity={1.9} color="#ffedd5" />
              <directionalLight position={[0, -4, -5]} intensity={1.3} color="#fed7aa" />
              <pointLight position={[0, 0, 0]} intensity={2.5} distance={4.5} color="#ea580c" />
              <pointLight position={[2, 3, 2]} intensity={1.4} distance={5} color="#fde047" />

              <Suspense fallback={<ProceduralFallbackMesh />}>
                <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.15}>
                  <KnowledgeCoreModel mousePos={mousePos} />
                </Float>
              </Suspense>
            </Canvas>
          </div>
        ) : (
          /* Static WebP Fallback with Curated 3D Crystal Polyhedron */
          <div className="auth-3d-matrix-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={crystalAnimWebp}
              alt="Academic 3D Crystal Core"
              style={{ width: '250px', height: '250px', objectFit: 'contain' }}
            />
            <span className="auth-3d-card-label" style={{ marginTop: '8px', textAlign: 'center' }}>
              Academic Knowledge Core · 3D Geometric Representation
            </span>
          </div>
        )}
      </div>

      {/* Bottom Architectural Matrix Cards & Status Indicators (Zero-Icon) */}
      <footer className="relative z-10 flex flex-col">
        <div className="auth-3d-matrix-grid">
          <div className="auth-3d-matrix-card">
            <BorderBeam size={130} duration={10} colorFrom="#ea580c" colorTo="#fbbf24" />
            <div className="auth-3d-card-label">
              3D Architecture
            </div>
            <div className="auth-3d-card-val">
              Interactive WebGL
            </div>
          </div>

          <div className="auth-3d-matrix-card">
            <BorderBeam size={130} duration={12} delay={4} colorFrom="#f97316" colorTo="#ea580c" />
            <div className="auth-3d-card-label">
              Constraint Matrix
            </div>
            <div className="auth-3d-card-val">
              0 Conflicts
            </div>
          </div>

          <div className="auth-3d-matrix-card">
            <BorderBeam size={130} duration={14} delay={8} colorFrom="#fbbf24" colorTo="#f97316" />
            <div className="auth-3d-card-label">
              Optimizer Efficiency
            </div>
            <div className="auth-3d-card-val">
              99.8% Pacing
            </div>
          </div>
        </div>

        <div className="auth-3d-footer-row">
          <span>SmartSchedule Academic SaaS · Quy Nhơn AI Campus</span>
          <span className="auth-3d-footer-brand">FPT University</span>
        </div>
      </footer>
    </aside>
  );
}

// Preload the GLB model in memory for instant transitions
useGLTF.preload('/models/academic-knowledge-core.glb');
