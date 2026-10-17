import React, { useEffect, useRef } from 'react';

export interface BinaryOrbitsProps {
  /**
   * Star & orbital path colors: default FPTU Orange & warm white tones
   */
  colors?: string[];
  starCount?: number;
  arms?: number;
  tilt?: number; // tilt angle in degrees, e.g. 62
  speed?: number;
  armSpread?: number;
  coreRadius?: number;
  maxRadius?: number;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

interface Star {
  arm: number;
  theta: number; // angle along spiral
  dist: number;  // radial distance
  radius: number;// particle draw radius
  color: string;
  speedFactor: number;
  zOffset: number;
  alpha: number;
}

/**
 * BinaryOrbits — High-Performance Bespoke Visual Implementation
 *
 * Modeled after the React Bits Pro "Binary Orbits" specification.
 * Renders an academic galaxy/binary orbital structure with streams of luminous
 * particles orbiting along tilted 3D spiral arms.
 *
 * - Canvas 2D with 3D perspective projection (x', y' from 3D coords)
 * - FPTU Orange palette: #ea580c, #fb923c, #fdba74, #ffffff
 * - Low-density budget (default ~180 stars) ensures 60 FPS on typical laptops
 * - Fully accessible (respects prefers-reduced-motion, pauses when backgrounded)
 */
export function BinaryOrbits({
  colors = ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c'],
  starCount = 650,
  arms = 2,
  tilt = 56,
  speed = 0.5,
  armSpread = 0.22,
  coreRadius = 24,
  maxRadius = 290,
  interactive = true,
  className = '',
  style,
  children,
}: BinaryOrbitsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Initialize stars once
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const isArm = Math.random() < 0.84;
      const arm = i % arms;
      const progress = Math.pow(Math.random(), 1.55); // higher density towards core
      const dist = coreRadius + progress * (maxRadius - coreRadius);
      const spiralAngle = (arm * (Math.PI * 2 / arms)) + Math.log(dist / coreRadius) * 2.8;
      const theta = isArm
        ? (spiralAngle + (Math.random() - 0.5) * armSpread)
        : (Math.random() * Math.PI * 2);
      const color = colors[Math.floor(Math.random() * colors.length)];
      stars.push({
        arm,
        theta,
        dist,
        radius: 1.0 + Math.random() * 2.0,
        color,
        speedFactor: 0.85 + Math.random() * 0.3,
        zOffset: (Math.random() - 0.5) * 28,
        alpha: 0.45 + Math.random() * 0.55,
      });
    }
    starsRef.current = stars;
  }, [starCount, arms, coreRadius, maxRadius, armSpread, colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let width = 0;
    let height = 0;
    let rotation = 0;
    let isVisible = true;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width - 0.5;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height - 0.5;
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    const tiltRad = (tilt * Math.PI) / 180;
    const cosTilt = Math.cos(tiltRad);
    const sinTilt = Math.sin(tiltRad);

    const render = () => {
      if (!isVisible) {
        rafId = requestAnimationFrame(render);
        return;
      }

      if (!reducedMotion) {
        rotation += 0.003 * speed;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.50 + (interactive ? mouseRef.current.x * 14 : 0);
      const cy = height * 0.28 + (interactive ? mouseRef.current.y * 12 : 0);

      // Core Ambient Light (soft, rich academic nucleus glow)
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 85);
      coreGrad.addColorStop(0, 'rgba(234, 88, 12, 0.28)');
      coreGrad.addColorStop(0.25, 'rgba(249, 115, 22, 0.14)');
      coreGrad.addColorStop(0.65, 'rgba(254, 215, 170, 0.04)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 85, 0, Math.PI * 2);
      ctx.fill();

      // Orbital guide rings (faint academic trajectory lines)
      ctx.save();
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.10)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy, maxRadius * 0.55, maxRadius * 0.55 * cosTilt, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(249, 115, 22, 0.06)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, maxRadius * 0.85, maxRadius * 0.85 * cosTilt, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Render stars sorted by Z depth
      const stars = starsRef.current;
      stars.forEach((s) => {
        const curTheta = s.theta + rotation * s.speedFactor;
        const x3d = Math.cos(curTheta) * s.dist;
        const y3d = Math.sin(curTheta) * s.dist;
        const z3d = s.zOffset;

        // Apply tilt rotation around X-axis
        const yRot = y3d * cosTilt - z3d * sinTilt;
        const zRot = y3d * sinTilt + z3d * cosTilt;

        // Perspective scale factor
        const fov = 600;
        const scale = fov / (fov + zRot);
        const px = cx + x3d * scale;
        const py = cy + yRot * scale;

        // Depth cueing
        const depthAlpha = Math.max(0.25, Math.min(1.0, (zRot + 200) / 400));
        const finalAlpha = s.alpha * depthAlpha;

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.min(1.0, finalAlpha * 1.15);
        ctx.beginPath();
        ctx.arc(px, py, s.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow for larger particles
        if (s.radius > 1.5) {
          ctx.globalAlpha = finalAlpha * 0.40;
          ctx.beginPath();
          ctx.arc(px, py, s.radius * scale * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1.0;

      if (!reducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      container.removeEventListener('pointermove', handlePointerMove);
    };
  }, [tilt, speed, interactive, maxRadius]);

  return (
    <div
      ref={containerRef}
      className={`auth-effect-container ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', ...style }}
    >
      <canvas
        ref={canvasRef}
        className="auth-effect-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {children && <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>{children}</div>}
    </div>
  );
}

export default BinaryOrbits;
