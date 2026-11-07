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
      className={`mobile-card flex flex-col items-center justify-center text-center p-6 my-3 ${className}`}
      style={{
        background: 'var(--m-surface)',
        borderRadius: 'var(--m-radius-lg)',
        border: '1px solid var(--m-border)',
        boxShadow: 'var(--m-shadow-card)',
      }}
    >
      <div
        className="w-13 h-13 rounded-2xl flex items-center justify-center text-[var(--m-brand-primary)] mb-3 shadow-xs"
        style={{
          background: 'var(--m-brand-soft)',
          border: '1px solid var(--m-brand-subtle)',
          color: 'var(--m-brand-primary)',
        }}
      >
        {icon || <Sparkles size={24} />}
      </div>

      <h3 className="text-sm font-bold text-[var(--m-text-primary)] tracking-tight mb-1">
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
          className="mobile-touch-target px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
          style={{
            background: 'var(--m-brand-primary)',
            color: '#ffffff',
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}
