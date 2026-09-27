import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────────────────────────────────────
   Reusable scroll-triggered animation wrappers
   Uses framer-motion whileInView for performant reveal
   ────────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
};

const fadeRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
};

const VARIANTS = { fadeUp, fadeLeft, fadeRight, scaleIn } as const;
export type AnimVariant = keyof typeof VARIANTS;

/* ── Single element reveal ─────────────────────────────── */

interface AnimatedSectionProps {
  children: ReactNode;
  variant?: AnimVariant;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function AnimatedSection({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.6,
  className,
  as = 'div',
}: AnimatedSectionProps) {
  const Component = motion[as];
  return (
    <Component
      variants={VARIANTS[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}

/* ── Stagger container for lists of cards ──────────────── */

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
}

const staggerParent = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: { staggerChildren: staggerDelay },
  }),
};

const staggerChild = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.12,
  duration = 0.5,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerParent}
      custom={staggerDelay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={staggerChild}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Re-export AnimatePresence for convenience ─────────── */
export { AnimatePresence, motion };
