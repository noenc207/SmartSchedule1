import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface MobileEmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function MobileEmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}: MobileEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-[var(--m-surface)] rounded-2xl border border-[var(--m-border)] shadow-sm my-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--m-brand-soft)] border border-[var(--m-brand-subtle)] flex items-center justify-center text-[var(--m-brand-primary)] mb-3.5 shadow-sm">
        {icon || <Sparkles size={26} />}
      </div>

      <h3 className="text-base font-bold text-[var(--m-text-primary)] tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs text-[var(--m-text-secondary)] max-w-[280px] leading-relaxed mb-4">
        {description}
      </p>

      {actionLabel && onAction && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="mobile-touch-target px-5 py-2.5 rounded-xl bg-[var(--m-brand-primary)] hover:bg-[var(--m-brand-bright)] text-white font-semibold text-xs shadow-md transition-colors"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}
