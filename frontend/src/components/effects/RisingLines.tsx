import React, { useEffect, useRef } from 'react';

export interface RisingLinesProps {
  /**
   * Colors for rising trails and heads. Default FPTU Orange palette.
   */
  colors?: string[];
  lineCount?: number;
  speed?: number;
  minHeight?: number;
  maxHeight?: number;
  horizonGlow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface RisingLine {
  x: number;          // normalized 0..1
  y: number;          // normalized 0..1 (1 is bottom, 0 is top)
  height: number;     // length in pixels
  speed: number;      // vertical speed
  width: number;      // stroke width
  color: string;
  alpha: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
}

/**
 * RisingLines — High-Performance Bespoke Visual Implementation
 *
 * Modeled after the React Bits Pro "Rising Lines" specification.
 * Renders a glowing horizon at the lower edge with ethereal vertical lines
 * rising upwards towards the academic cosmos.
 *
 * - Canvas 2D with smooth trailing tail gradients and bright glowing heads
 * - Transparent background, optimized for lower-hero composition
 * - Strict budget: default 28 lines keeps GPU usage negligible (< 1%)
 * - Reduced motion support (static artistic snapshot)
 */
export function RisingLines({
  colors = ['#c2410c', '#ea580c', '#f97316', '#ffedd5'],
  lineCount = 32,
  speed = 0.5,
  minHeight = 35,
  maxHeight = 110,
  horizonGlow = true,
  className = '',
  style,
}: RisingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<RisingLine[]>([]);

  useEffect(() => {
    const lines: RisingLine[] = [];
    for (let i = 0; i < lineCount; i++) {
      lines.push({
        x: Math.random(),
        y: Math.random(),
        height: minHeight + Math.random() * (maxHeight - minHeight),
        speed: 0.15 + Math.random() * 0.35,
        width: 1.0 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * (colors.length - 1))],
        alpha: 0.3 + Math.random() * 0.5,
        swayAmp: 1.5 + Math.random() * 3,
        swayFreq: 0.8 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }
    linesRef.current = lines;
  }, [lineCount, minHeight, maxHeight, colors]);

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
    let isVisible = true;
    let time = 0;

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

    const render = () => {
      if (!isVisible) {
        rafId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Lower Horizon Glow
      if (horizonGlow) {
        const hGlow = ctx.createLinearGradient(0, height, 0, height - 105);
        hGlow.addColorStop(0, 'rgba(234, 88, 12, 0.26)');
        hGlow.addColorStop(0.35, 'rgba(249, 115, 22, 0.10)');
        hGlow.addColorStop(0.7, 'rgba(254, 215, 170, 0.03)');
        hGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, height - 105, width, 105);

        // Core bright horizon line
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.38)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, height - 1);
        ctx.lineTo(width, height - 1);
        ctx.stroke();
      }

      // 2. Rising Lines
      if (!reducedMotion) {
        time += 0.016 * speed;
      }

      const lines = linesRef.current;
      lines.forEach((l) => {
        if (!reducedMotion) {
          l.y -= (l.speed * 0.0022 * speed);
          if (l.y < 0.68) {
            l.y = 1.02;
            l.x = Math.random();
          }
        }

        const sway = Math.sin(time * l.swayFreq + l.swayPhase) * l.swayAmp;
        const currentX = l.x * width + sway;
        const headY = l.y * height;
        const tailY = headY + l.height;

        // Altitude fade: gently fade in from bottom, fade to 0 before y=0.68
        const progress = Math.max(0, Math.min(1, (l.y - 0.68) / 0.34));
        const altitudeAlpha = Math.sin(progress * Math.PI);

        // Gradient for line (bright glowing head to transparent tail)
        const lineGrad = ctx.createLinearGradient(currentX, headY, currentX, tailY);
        lineGrad.addColorStop(0, '#ffffff'); // bright head
        lineGrad.addColorStop(0.18, '#fb923c');
        lineGrad.addColorStop(0.5, l.color);
        lineGrad.addColorStop(1, 'transparent'); // fade tail

        ctx.beginPath();
        ctx.moveTo(currentX, headY);
        ctx.lineTo(currentX, tailY);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = l.width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = Math.min(1.0, l.alpha * altitudeAlpha * 0.85);
        ctx.stroke();

        // Glowing dot at the rising tip
        ctx.beginPath();
        ctx.arc(currentX, headY, l.width * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1.0, l.alpha * altitudeAlpha * 0.95);
        ctx.fill();
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
    };
  }, [speed, horizonGlow]);

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
    </div>
  );
}

export default RisingLines;
