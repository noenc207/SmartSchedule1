import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface MobileListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  rightNode?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export function MobileListItem({
  title,
  subtitle,
  meta,
  icon,
  rightNode,
  showChevron = false,
  onClick,
  className = '',
  badge,
  disabled = false,
}: MobileListItemProps) {
  const isInteractive = Boolean(onClick) && !disabled;

  return (
    <motion.div
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      onClick={isInteractive ? onClick : undefined}
      className={`mobile-list-item ${isInteractive ? 'cursor-pointer hover:border-[var(--m-brand-bright)]' : ''} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {icon && <div className="shrink-0 flex items-center justify-center">{icon}</div>}

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <div className="text-[0.9375rem] font-semibold text-[var(--m-text-primary)] truncate">
            {title}
          </div>
          {badge}
        </div>
        {subtitle && (
          <div className="text-[0.8125rem] text-[var(--m-text-secondary)] mt-0.5 truncate">
            {subtitle}
          </div>
        )}
        {meta && (
          <div className="text-[0.75rem] text-[var(--m-text-muted)] mt-1 truncate">
            {meta}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {rightNode}
        {showChevron && <ChevronRight size={18} className="text-[var(--m-text-muted)]" />}
      </div>
    </motion.div>
  );
}
