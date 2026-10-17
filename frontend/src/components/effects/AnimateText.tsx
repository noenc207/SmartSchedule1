import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * SmartSchedule Academic Text Animation Suite
 * Powered by animate-text specifications (.agents/skills/animate-text)
 *
 * Exact Signature Easing Curves:
 * - softBlurIn: cubic-bezier(0.22, 1, 0.36, 1) [Apple keynote headline reveal]
 * - shimmerSweep: cubic-bezier(0.22, 1, 0.36, 1) [Gliding headline micro-entrance]
 * - microScaleFade: cubic-bezier(0.32, 0.72, 0, 1) [System status/label calm pop]
 * - perCharacterRise: cubic-bezier(0.2, 0.8, 0.2, 1) [Crisp tvOS kinetic letter rise]
 */

export const ANIMATE_TEXT_EASINGS = {
  softBlurIn: [0.22, 1, 0.36, 1] as const,
  shimmerSweep: [0.22, 1, 0.36, 1] as const,
  microScaleFade: [0.32, 0.72, 0, 1] as const,
  perCharacterRise: [0.2, 0.8, 0.2, 1] as const,
};

// ============================================================================
// 1. SoftBlurInText — Hero Heading per-character fade-in with gentle blur
// ============================================================================

export interface SoftBlurInTextProps {
  text: string;
  delay?: number; // Delay in seconds (e.g. 0.18)
  duration?: number; // Duration in seconds (spec default: 0.9s = 900ms)
  stagger?: number; // Per-char stagger in seconds (spec default: 0.025s = 25ms)
  className?: string;
  highlight?: boolean; // FPTU orange text emphasis
  as?: 'div' | 'span';
  style?: React.CSSProperties;
}

export function SoftBlurInText({
  text,
  delay = 0,
  duration = 0.9,
  stagger = 0.025,
  className = '',
  highlight = false,
  as = 'span',
  style,
}: SoftBlurInTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = as === 'div' ? 'div' : 'span';
  const displayMode = style?.display || (as === 'div' || className.includes('block') ? 'block' : 'inline-block');

  // Split into words to prevent unnatural mid-word breaks during responsive reflow
  const words = useMemo(() => text.split(' '), [text]);

  // Compute cumulative char offsets so stagger flows continuously across words
  const wordCharOffsets = useMemo(() => {
    const offsets: number[] = [];
    let count = 0;
    words.forEach((w) => {
      offsets.push(count);
      count += w.length + 1; // +1 for space
    });
    return offsets;
  }, [words]);

  const highlightStyles: React.CSSProperties = highlight
    ? {
        color: '#ea580c',
        textShadow: '0 0 24px rgba(234, 88, 12, 0.18)',
      }
    : {};

  return (
    <Component
      role="text"
      aria-label={text}
      className={`auth-soft-blur-in ${highlight ? 'auth-text-highlight' : ''} ${className}`}
      style={{
        display: displayMode,
        overflow: 'visible',
        ...highlightStyles,
        ...style,
      }}
    >
      {/* Screen reader text: assistive tech announces clean text and SSR matches exact strings */}
      <span className="sr-only">{text}</span>

      {/* Visual animated character sequence */}
      <span aria-hidden="true" style={{ overflow: 'visible', display: 'inline' }}>
        {words.map((word, wordIdx) => {
          const startOffset = wordCharOffsets[wordIdx] || 0;
          return (
            <React.Fragment key={wordIdx}>
              <span
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                }}
              >
                {Array.from(word).map((char, charIdx) => {
                  const globalIdx = startOffset + charIdx;
                  return (
                    <motion.span
                      key={charIdx}
                      className="inline-block"
                      initial={
                        shouldReduceMotion
                          ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                          : { opacity: 0, y: 16, filter: 'blur(12px)' }
                      }
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration,
                        delay: delay + globalIdx * stagger,
                        ease: ANIMATE_TEXT_EASINGS.softBlurIn,
                      }}
                      style={{
                        display: 'inline-block',
                        willChange: 'transform, opacity, filter',
                        overflow: 'visible',
                      }}
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
              {wordIdx < words.length - 1 && (
                <span className="inline-block" style={{ whiteSpace: 'pre' }}>
                  {' '}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </span>
    </Component>
  );
}

// ============================================================================
// 2. ShimmerSweepBadge — Campus badge entry glide (-22px, 8px blur) with one-shot sweep
// ============================================================================

export interface ShimmerSweepBadgeProps {
  children: React.ReactNode;
  delay?: number; // Delay in seconds (e.g. 0)
  duration?: number; // Duration in seconds (spec default: 0.85s = 850ms)
  className?: string;
  as?: 'div' | 'span';
  style?: React.CSSProperties;
}

export function ShimmerSweepBadge({
  children,
  delay = 0,
  duration = 0.85,
  className = '',
  as = 'div',
  style,
}: ShimmerSweepBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = as === 'span' ? motion.span : motion.div;

  return (
    <MotionComponent
      className={`auth-shimmer-sweep-badge relative overflow-hidden ${className}`}
      initial={
        shouldReduceMotion
          ? { opacity: 1, x: 0, filter: 'blur(0px)' }
          : { opacity: 0, x: -22, filter: 'blur(8px)' }
      }
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{
        duration,
        delay,
        ease: ANIMATE_TEXT_EASINGS.shimmerSweep,
      }}
      style={{
        willChange: 'transform, opacity, filter',
        ...style,
      }}
    >
      {children}

      {/* One-shot luminous shimmer sweep at mount — subtle and never loops endlessly */}
      {!shouldReduceMotion && (
        <motion.span
          className="pointer-events-none absolute inset-0 z-10"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '220%', opacity: [0, 0.45, 0] }}
          transition={{
            duration: 0.85,
            delay: delay + 0.3,
            ease: ANIMATE_TEXT_EASINGS.shimmerSweep,
          }}
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(234, 88, 12, 0.24) 45%, rgba(251, 191, 36, 0.32) 55%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
    </MotionComponent>
  );
}

// ============================================================================
// 3. MicroScaleFadeText — Form Heading calm whole-unit scale pop (0.96 -> 1)
// ============================================================================

export interface MicroScaleFadeTextProps {
  text: string;
  delay?: number; // Delay in seconds (spec default: 0.15s)
  duration?: number; // Duration in seconds (spec default: 0.6s = 600ms)
  className?: string;
  style?: React.CSSProperties;
}

export function MicroScaleFadeText({
  text,
  delay = 0.15,
  duration = 0.6,
  className = '',
  style,
}: MicroScaleFadeTextProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      role="text"
      className={`auth-micro-scale-fade inline-block ${className}`}
      initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration,
        delay,
        ease: ANIMATE_TEXT_EASINGS.microScaleFade,
      }}
      style={{
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {text}
    </motion.span>
  );
}

// ============================================================================
// 4. PerCharacterRiseText — Status milestone labels crisp, zero-blur rise
// ============================================================================

export interface PerCharacterRiseTextProps {
  text: string;
  delay?: number; // Delay in seconds
  duration?: number; // Duration in seconds (spec default: 0.6s = 600ms)
  stagger?: number; // Per-character stagger (spec default: 0.024s = 24ms)
  className?: string;
  style?: React.CSSProperties;
}

export function PerCharacterRiseText({
  text,
  delay = 0,
  duration = 0.6,
  stagger = 0.024,
  className = '',
  style,
}: PerCharacterRiseTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <span
      role="text"
      aria-label={text}
      className={`auth-per-character-rise inline-flex items-center ${className}`}
      style={{
        overflow: 'hidden',
        verticalAlign: 'baseline',
        ...style,
      }}
    >
      {/* Screen reader text */}
      <span className="sr-only">{text}</span>

      {/* Visual character slide */}
      <span aria-hidden="true" className="inline-flex">
        {chars.map((char, index) => (
          <motion.span
            key={index}
            className="inline-block"
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration,
              delay: delay + index * stagger,
              ease: ANIMATE_TEXT_EASINGS.perCharacterRise,
            }}
            style={{
              willChange: 'transform, opacity',
              display: 'inline-block',
              whiteSpace: 'pre',
            }}
          >
            {char}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
