import React, { useEffect, useRef, useCallback } from 'react';

export interface LuminousFilamentsProps {
  /**
   * Two-color gradient for the filaments: [source color, ends color].
   * FPTU Orange palette default: ['#c2410c', '#f97316']
   */
  colors?: [string, string];
  backgroundColor?: string;
  mode?: 'auto' | 'glow' | 'ink';
  fibers?: number;
  lineWidth?: number;
  sheath?: number;
  defocus?: number;
  length?: number;
  spread?: number;
  neck?: number;
  flare?: number;
  originX?: number;
  originY?: number;
  angle?: number;
  twist?: number;
  depth?: number;
  spin?: number;
  sway?: number;
  breathe?: number;
  flowSpeed?: number;
  pulses?: number;
  pulseRate?: number;
  stagger?: number;
  reach?: number;
  glow?: number;
  intensity?: number;
  speed?: number;
  interactive?: boolean;
  hoverPulses?: boolean;
  clickSurge?: boolean;
  paused?: boolean;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

interface FiberCurve {
  angleOffset: number;
  spreadOffset: number;
  lengthFactor: number;
  depthZ: number;
  phase: number;
  pulsePhase: number;
  glowStrength: number;
}

/**
 * LuminousFilaments — High-Performance Bespoke Visual Implementation
 *
 * Modeled after the React Bits Pro "Luminous Filaments" specification.
 * Renders glowing fibers fanning out from a luminous convergence point,
 * with light pulses flowing along curved trajectories.
 *
 * - Pure Canvas 2D / RAF rendering with DPI awareness
 * - Zero external assets, 0 icons, fully responsive
 * - Supports 'ink' mode for light backgrounds & 'glow' for dark backgrounds
 * - Respects prefers-reduced-motion and document visibility
 */
export function LuminousFilaments({
  colors = ['#ea580c', '#f97316'],
  backgroundColor = 'transparent',
  mode = 'ink',
  fibers = 64,
  lineWidth = 1.4,
  sheath = 0.65,
  defocus = 0.7,
  length = 1.15,
  spread = 0.95,
  neck = 0.04,
  flare = 1.25,
  originX = 0.5,
  originY = 0.0,
  angle = 0,
  twist = 0.3,
  depth = 0.55,
  spin = 0.08,
  sway = 0.8,
  breathe = 0.45,
  flowSpeed = 0.35,
  pulses = 1.2,
  pulseRate = 0.45,
  stagger = 0.35,
  reach = 0.88,
  glow = 0.5,
  intensity = 1.0,
  speed = 1.0,
  interactive = true,
  hoverPulses = true,
  clickSurge = true,
  paused = false,
  quality = 1.0,
  className = '',
  style,
  children,
}: LuminousFilamentsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, hover: false, surge: 0 });
  const fibersDataRef = useRef<FiberCurve[]>([]);

  // Initialize fiber parameters once or when fibers count changes
  useEffect(() => {
    const data: FiberCurve[] = [];
    for (let i = 0; i < fibers; i++) {
      const norm = (i / (fibers - 1) - 0.5) * 2; // -1 to 1
      data.push({
        angleOffset: norm * 0.45,
        spreadOffset: norm,
        lengthFactor: 0.82 + Math.random() * 0.36,
        depthZ: Math.sin(norm * Math.PI) * 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        pulsePhase: norm * stagger * Math.PI * 2,
        glowStrength: 0.6 + Math.random() * 0.4,
      });
    }
    fibersDataRef.current = data;
  }, [fibers, stagger]);

  // Main animation and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let time = 0;
    let isVisible = true;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
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

    // Pointer events
    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.x = (e.clientX - rect.left) / rect.width;
      pointerRef.current.y = (e.clientY - rect.top) / rect.height;
      pointerRef.current.hover = true;
    };

    const handlePointerLeave = () => {
      pointerRef.current.hover = false;
    };

    const handleClick = () => {
      if (clickSurge) {
        pointerRef.current.surge = 1.0;
      }
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    container.addEventListener('click', handleClick);

    // Render step
    const render = (timestamp: number) => {
      if (!isVisible) {
        rafId = requestAnimationFrame(render);
        return;
      }

      if (!reducedMotion && !paused) {
        time = (timestamp * 0.001) * speed;
      }

      ctx.clearRect(0, 0, width, height);

      if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      const ox = width * originX;
      const oy = height * originY;
      const fiberList = fibersDataRef.current;
      const effectiveLen = height * length;

      // Convergence Glow at root (soft, subtle ambient illumination)
      const rootGlow = ctx.createRadialGradient(ox, oy, 2, ox, oy, 110);
      if (mode === 'ink') {
        rootGlow.addColorStop(0, 'rgba(234, 88, 12, 0.26)');
        rootGlow.addColorStop(0.35, 'rgba(249, 115, 22, 0.12)');
        rootGlow.addColorStop(0.75, 'rgba(251, 146, 60, 0.04)');
        rootGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        rootGlow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        rootGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.15)');
        rootGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
      }
      ctx.fillStyle = rootGlow;
      ctx.beginPath();
      ctx.arc(ox, oy, 110, 0, Math.PI * 2);
      ctx.fill();

      // Surge damping
      if (pointerRef.current.surge > 0.01) {
        pointerRef.current.surge *= 0.94;
      }

      // Draw each fiber curve with organic angular progression (not a rigid cone)
      const rad = ((angle + 90) * Math.PI) / 180;
      const tanX = Math.cos(rad);
      const tanY = Math.sin(rad);
      const normX = -tanY;
      const normY = tanX;

      fiberList.forEach((f) => {
        const swayOffset = Math.sin(time * 0.8 + f.phase) * (sway * 16);
        const breatheScale = 1.0 + Math.sin(time * 0.5 + f.phase * 0.5) * (breathe * 0.10);
        const spinShift = Math.sin(time * spin + f.angleOffset) * (width * 0.05);

        // Natural ribbon dispersion at root (aperture ring of 16px)
        const rootSpread = f.spreadOffset * 16;
        const startX = ox + normX * rootSpread;
        const startY = oy + normY * rootSpread;

        // Organic S-curve undulating ribbon trajectory
        const twistOffset = twist * width * 0.22 * Math.sin((f.lengthFactor * 0.9 + time * 0.2) * Math.PI);
        const spreadWidth = f.spreadOffset * (width * spread * 0.22) * breatheScale + swayOffset;

        // Billowing curve arc
        const bowWave = Math.sin(f.angleOffset * 2.2 + time * 0.4) * (width * 0.06);

        const endDist = effectiveLen * f.lengthFactor;
        const endX = startX + tanX * endDist + normX * (spreadWidth + twistOffset);
        const endY = startY + tanY * endDist + normY * (spreadWidth + twistOffset);

        // Control point 1 sweeps outward along the normal vector
        const cp1Dist = effectiveLen * 0.32;
        const cp1x = startX + tanX * cp1Dist + normX * (spreadWidth * 0.35 + bowWave + twistOffset * 0.5);
        const cp1y = startY + tanY * cp1Dist + normY * (spreadWidth * 0.35 + bowWave + twistOffset * 0.5);

        // Control point 2 completes the graceful S-curve flow
        const cp2Dist = effectiveLen * 0.68;
        const cp2x = startX + tanX * cp2Dist + normX * (spreadWidth * 0.75 - bowWave * 0.5 + twistOffset * 0.8);
        const cp2y = startY + tanY * cp2Dist + normY * (spreadWidth * 0.75 - bowWave * 0.5 + twistOffset * 0.8);

        // Pulse position along curve
        const pulseCycle = ((time * flowSpeed + f.pulsePhase) % 1.0);
        const surgeBonus = pointerRef.current.surge * 0.5;

        // Gradient for this strand (soft progression that fades at tail)
        const strandGrad = ctx.createLinearGradient(startX, startY, endX, endY);
        const isInk = mode === 'ink';

        if (isInk) {
          strandGrad.addColorStop(0, '#c2410c');
          strandGrad.addColorStop(0.2, '#ea580c');
          strandGrad.addColorStop(reach, '#f97316');
          strandGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else {
          strandGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
          strandGrad.addColorStop(0.2, colors[0]);
          strandGrad.addColorStop(reach, colors[1]);
          strandGrad.addColorStop(1, 'transparent');
        }

        // Base strand — delicate, whisper-soft silk lines
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.strokeStyle = strandGrad;
        ctx.lineWidth = lineWidth * (0.85 - f.depthZ * (depth * 0.2));
        ctx.lineCap = 'round';
        ctx.globalAlpha = (0.28 + (1.0 - f.depthZ * 0.3) * 0.38) * intensity;
        ctx.stroke();

        // Glowing sheath — soft halo
        if (sheath > 0.05) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
          ctx.strokeStyle = colors[1];
          ctx.lineWidth = lineWidth * (1.0 + sheath * 1.5);
          ctx.globalAlpha = 0.06 * glow * intensity;
          ctx.stroke();
        }

        // Flowing light pulse particle along curve
        if (pulses > 0.1 && reach > 0.3) {
          const t = Math.min(reach, pulseCycle);
          // Cubic Bezier interpolation at t
          const invT = 1 - t;
          const px = invT * invT * invT * startX +
            3 * invT * invT * t * cp1x +
            3 * invT * t * t * cp2x +
            t * t * t * endX;
          const py = invT * invT * invT * startY +
            3 * invT * invT * t * cp1y +
            3 * invT * t * t * cp2y +
            t * t * t * endY;

          const pGlow = ctx.createRadialGradient(px, py, 1, px, py, 6 + surgeBonus * 8);
          if (isInk) {
            pGlow.addColorStop(0, '#ffffff');
            pGlow.addColorStop(0.25, '#ea580c');
            pGlow.addColorStop(0.65, 'rgba(249, 115, 22, 0.7)');
            pGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
          } else {
            pGlow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            pGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.55)');
            pGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
          }
          ctx.fillStyle = pGlow;
          ctx.beginPath();
          ctx.arc(px, py, 6 + surgeBonus * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1.0;

      if (!reducedMotion && !paused) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('click', handleClick);
    };
  }, [
    colors,
    backgroundColor,
    mode,
    fibers,
    lineWidth,
    sheath,
    defocus,
    length,
    spread,
    neck,
    flare,
    originX,
    originY,
    angle,
    twist,
    depth,
    spin,
    sway,
    breathe,
    flowSpeed,
    pulses,
    pulseRate,
    reach,
    glow,
    intensity,
    speed,
    interactive,
    hoverPulses,
    clickSurge,
    paused,
    quality,
  ]);

  return (
    <div
      ref={containerRef}
      className={`auth-effect-container ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', ...style }}
    >
      <canvas
        ref={canvasRef}
        className="auth-effect-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
      {children && <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>{children}</div>}
    </div>
  );
}

export default LuminousFilaments;
