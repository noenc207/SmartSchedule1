import React, { useCallback, useEffect, useRef } from 'react';
import BlurText from '../../components/BlurText';
import { LuminousFilaments } from '../../components/effects/LuminousFilaments';
import { BinaryOrbits } from '../../components/effects/BinaryOrbits';
import { RisingLines } from '../../components/effects/RisingLines';
import { MagicTransform } from '../../components/effects/MagicTransform';

export interface AuthVisualHeroProps {
  mode?: 'login' | 'register';
  className?: string;
}

/**
 * AuthVisualHero — SmartSchedule Authentication Visual Hero
 *
 * Art Direction: "The Future of Learning — A Living Academic Universe"
 * Palette: Pure White × Radiant FPTU Orange (#ea580c / #f97316)
 *
 * Controlled Visual Hierarchy:
 * 1. Deepest Layer: Binary Orbits (celestial 3D spiral galaxy of academic stars)
 * 2. Elegant Ribbon: Luminous Filaments (flowing silk fibers sweeping from top-right corner)
 * 3. Lower Horizon: Rising Lines (gentle upward light wisps confined to the horizon)
 * 4. Academic Showcase: Magic Transform (intelligent schedule transformation with 0 conflicts)
 *
 * Zero-Icon Compliance:
 * - 0 SVG icons, 0 Lucide, 100% pure typography, layout, borders, and motion.
 */
export function AuthVisualHero({ mode = 'login', className = '' }: AuthVisualHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });

  // Interactive tilt/parallax — smooth lerp
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const scene = sceneRef.current;
    if (!hero || !scene) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    let running = true;

    const tick = () => {
      if (!running) return;

      const { x: tx, y: ty } = mouseRef.current;
      const cur = currentRef.current;

      cur.x += (tx - cur.x) * 0.05;
      cur.y += (ty - cur.y) * 0.05;

      const rotateY = (cur.x - 0.5) * 8;
      const rotateX = -(cur.y - 0.5) * 6;

      scene.style.transform =
        `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      hero.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <aside
      ref={heroRef}
      className={`auth-visual-hero ${className}`}
      aria-label="Visual introduction"
    >
      {/* 1. Underlying Academic Cosmos Gradient */}
      <div className="auth-hero-bg" aria-hidden="true">
        <div className="auth-hero-bg-gradient" />
        <div className="auth-hero-bg-radial" />
        <div className="auth-hero-bg-mesh" />
      </div>

      {/* 2. Deepest Depth: Binary Orbits (Celestial Academic Starfield) */}
      <div className="auth-hero-particles-layer" aria-hidden="true">
        <BinaryOrbits
          colors={['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c']}
          starCount={680}
          tilt={56}
          speed={0.45}
          maxRadius={290}
          className="opacity-95"
        />
      </div>

      {/* 3. Primary Visual: Luminous Filaments (Organic Silk Ribbon Flow in Upper Sky) */}
      <div className="auth-hero-art-layer auth-3d-viewport" aria-hidden="true">
        <div ref={sceneRef} className="auth-3d-scene" style={{ transformStyle: 'preserve-3d' }}>
          <LuminousFilaments
            colors={['#ea580c', '#f97316']}
            backgroundColor="transparent"
            mode="ink"
            fibers={32}
            lineWidth={1.1}
            sheath={0.35}
            reach={0.85}
            flare={1.1}
            length={0.46}
            flowSpeed={0.30}
            pulses={1.0}
            originX={0.68}
            originY={-0.02}
            angle={32}
            twist={0.30}
            spread={0.65}
            neck={0.40}
            className="w-full h-full opacity-85"
          />
        </div>
      </div>

      {/* 4. Lower Horizon: Rising Lines (Confined to Bottom Horizon) */}
      <div className="auth-hero-grid-layer" aria-hidden="true">
        <div className="absolute inset-0 pointer-events-none">
          <RisingLines
            colors={['#c2410c', '#ea580c', '#f97316', '#ffedd5']}
            lineCount={36}
            speed={0.35}
            minHeight={35}
            maxHeight={110}
            horizonGlow={true}
          />
        </div>
      </div>

      {/* 5. Atmospheric Lighting */}
      <div className="auth-hero-glow" aria-hidden="true" />

      {/* 6. Content Overlay — Clear, Balanced Typography & Showcase */}
      <div className="auth-hero-content">
        {/* Campus Identity */}
        <div className="auth-hero-campus-row">
          <span className="auth-hero-campus-pill">
            FPT UNIVERSITY QUY NHƠN · AI CAMPUS
          </span>
          <span className="auth-hero-edition-pill">
            ACADEMIC EDITION 2026
          </span>
        </div>

        {/* Hero Headings */}
        <div className="auth-hero-headline-block">
          <p className="auth-hero-eyebrow">
            THE FUTURE OF LEARNING
          </p>
          <h2 className="auth-hero-title">
            <BlurText
              text="A Living Academic"
              delay={120}
              effect="blur"
              className="auth-hero-title-text"
            />
            <span className="auth-hero-highlight">
              <BlurText
                text="Universe."
                delay={280}
                effect="blur"
                className="auth-hero-title-text"
              />
            </span>
          </h2>
          <p className="auth-hero-subtitle">
            SmartSchedule continuously reconciles complex academic timetables,
            research deadlines, and cognitive focus blocks into an achievable,
            intelligent flow.
          </p>

          {/* Transformation Showcase: Magic Transform */}
          <MagicTransform className="mt-4" />
        </div>

        {/* Compact Status Chips — Elegant Minimalist SaaS Badges */}
        <div className="auth-hero-cards-grid" role="region" aria-label="Platform highlights">
          <div className="auth-hero-card">
            <span className="auth-hero-card-tag">ENGINE</span>
            <strong className="auth-hero-card-metric">0 Conflicts</strong>
          </div>

          <div className="auth-hero-card">
            <span className="auth-hero-card-tag">PACING</span>
            <strong className="auth-hero-card-metric">100% Balanced</strong>
          </div>

          <div className="auth-hero-card">
            <span className="auth-hero-card-tag">CAMPUS</span>
            <strong className="auth-hero-card-metric">K15 — K20</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-hero-footer">
          <span className="auth-hero-footer-label">
            POWERED BY DEEP OPTIMIZATION &amp; CAMPUS INTELLIGENCE
          </span>
        </div>
      </div>
    </aside>
  );
}

export default AuthVisualHero;
