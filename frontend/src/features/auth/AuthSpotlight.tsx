import React, { useEffect, useRef } from 'react';

export interface AuthSpotlightProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Interactive Flashlight / Spotlight for SmartSchedule Authentication
 *
 * Features:
 * - Fluid pointer-following dual-layer spotlight on desktop with physics-based smooth damping.
 * - Harmonious with FPTU Orange (#ea580c) and crisp academic SaaS canvas.
 * - Non-intrusive (pointer-events: none) - never blocks clicks, inputs, or accessibility focus.
 * - Touch-aware: gracefully switches to static ambient illumination on mobile/touch screens.
 * - Honors prefers-reduced-motion: reduce by turning off dynamic RAF loop.
 * - Strict lifecycle teardown: cleans up requestAnimationFrame and event listeners.
 */
export function AuthSpotlight({ className = '', children }: AuthSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const spotlight = spotlightRef.current;
    if (!container || !spotlight) return;

    // Check prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) {
      container.style.setProperty('--spotlight-x', '50%');
      container.style.setProperty('--spotlight-y', '35%');
      return;
    }

    // Touch device detection: do not run continuous pointer tracking on touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      container.style.setProperty('--spotlight-x', '50%');
      container.style.setProperty('--spotlight-y', '32%');
      return;
    }

    let rafId: number = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let isMoving = false;

    // Initial position
    const updatePositionVars = (x: number, y: number) => {
      container.style.setProperty('--spotlight-x', `${x.toFixed(1)}px`);
      container.style.setProperty('--spotlight-y', `${y.toFixed(1)}px`);
    };

    updatePositionVars(currentX, currentY);

    const tick = () => {
      // Damped smooth spring-like following
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        currentX += dx * 0.12;
        currentY += dy * 0.12;
        updatePositionVars(currentX, currentY);
        rafId = requestAnimationFrame(tick);
      } else {
        currentX = targetX;
        currentY = targetY;
        updatePositionVars(currentX, currentY);
        isMoving = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore simulated mouse events from touch
      if (e.pointerType === 'touch') return;

      const rect = container.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      if (!isMoving) {
        isMoving = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`auth-spotlight-wrapper ${className}`}>
      <div ref={spotlightRef} className="auth-spotlight-beam" aria-hidden="true" />
      <div className="auth-spotlight-core" aria-hidden="true" />
      {children}
    </div>
  );
}
