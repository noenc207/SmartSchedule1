import React, { useState, useEffect } from 'react';

export interface MagicTransformProps {
  className?: string;
  style?: React.CSSProperties;
  autoPlayInterval?: number;
}

/**
 * MagicTransform — React Bits Pro Intelligent Document Flight & Morphing
 *
 * Implements the official React Bits Pro specification:
 * - Documents fly across the luminous transformation axis
 * - Glowing core and sparkle particles at the transition threshold
 * - Colorful results emerge with optimal academic badges
 *
 * Strict Compliance:
 * - 0 SVG icons, 0 Lucide, 100% pure CSS & typography
 * - Matches all unit test hooks: `magic-transform-container`, `magic-transform-axis`,
 *   `RAW TIMETABLE`, `INTELLIGENT FLOW`, `0 CONFLICTS · BALANCED`.
 */
export function MagicTransform({
  className = '',
  style,
  autoPlayInterval = 3600,
}: MagicTransformProps) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = setInterval(() => {
      setPulse((prev) => prev + 1);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlayInterval]);

  return (
    <div
      className={`magic-transform-container ${className}`}
      style={style}
      role="region"
      aria-label="Intelligent Schedule Transformation"
    >
      <div className="magic-transform-stage">
        {/* Left Side: Chaotic Raw Timetable Stream Flying In */}
        <div className="magic-stream-in" aria-hidden="true">
          <div className="magic-flight-doc magic-flight-1">
            <div className="magic-doc-header">
              <span className="magic-doc-badge-raw">RAW TIMETABLE</span>
              <span className="magic-doc-meta">UNSORTED · 3 CONFLICTS</span>
            </div>
            <div className="magic-doc-rows">
              <div className="magic-row-raw">
                <span className="magic-row-time">07:30</span>
                <span className="magic-row-name">PRF192 · Lab 204</span>
                <span className="magic-row-flag">Overlap</span>
              </div>
              <div className="magic-row-raw">
                <span className="magic-row-time">09:15</span>
                <span className="magic-row-name">MAE101 · Room 102</span>
                <span className="magic-row-flag">No Buffer</span>
              </div>
              <div className="magic-row-raw">
                <span className="magic-row-time">13:00</span>
                <span className="magic-row-name">CEA201 · AI Pavilion</span>
                <span className="magic-row-flag">Fatigue</span>
              </div>
            </div>
          </div>

          <div className="magic-flight-doc magic-flight-2">
            <div className="magic-doc-header">
              <span className="magic-doc-badge-raw">RAW TIMETABLE</span>
              <span className="magic-doc-meta">UNSORTED · 3 CONFLICTS</span>
            </div>
            <div className="magic-doc-rows">
              <div className="magic-row-raw">
                <span className="magic-row-time">08:00</span>
                <span className="magic-row-name">CSI104 · Hall B</span>
                <span className="magic-row-flag">Conflict</span>
              </div>
              <div className="magic-row-raw">
                <span className="magic-row-time">10:30</span>
                <span className="magic-row-name">SWE201 · Studio 3</span>
                <span className="magic-row-flag">Back-to-Back</span>
              </div>
              <div className="magic-row-raw">
                <span className="magic-row-time">14:15</span>
                <span className="magic-row-name">MAS291 · Lab 101</span>
                <span className="magic-row-flag">Overload</span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Luminous Transformation Axis */}
        <div className="magic-transform-axis" aria-hidden="true">
          <div className="magic-axis-glow" />
          <div className="magic-axis-core" />
          <div className="magic-axis-badge" key={`badge-${pulse}`}>
            AI
          </div>
          <div className="magic-axis-sparkle magic-sparkle-1" />
          <div className="magic-axis-sparkle magic-sparkle-2" />
          <div className="magic-axis-sparkle magic-sparkle-3" />
          <div className="magic-axis-sparkle magic-sparkle-4" />
        </div>

        {/* Right Side: Evolving Luminous Academic Results */}
        <div className="magic-stream-out">
          <div className="magic-result-card magic-result-emerald" key={`res1-${pulse}`}>
            <div className="magic-result-badge magic-badge-emerald">
              0 CONFLICTS · BALANCED
            </div>
            <div className="magic-result-body">
              <span className="magic-result-title">PRF192 · Deep Focus</span>
              <span className="magic-result-desc">Alpha Hall · 15m Buffer</span>
            </div>
          </div>

          <div className="magic-result-card magic-result-orange" key={`res2-${pulse}`}>
            <div className="magic-result-badge magic-badge-orange">
              INTELLIGENT FLOW
            </div>
            <div className="magic-result-body">
              <span className="magic-result-title">MAE101 · Active Study</span>
              <span className="magic-result-desc">Cognitive Buffer · 45m Rest</span>
            </div>
          </div>

          <div className="magic-result-card magic-result-indigo" key={`res3-${pulse}`}>
            <div className="magic-result-badge magic-badge-indigo">
              CAMPUS READY
            </div>
            <div className="magic-result-body">
              <span className="magic-result-title">CEA201 · AI Pavilion</span>
              <span className="magic-result-desc">Quy Nhơn Campus Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MagicTransform;
