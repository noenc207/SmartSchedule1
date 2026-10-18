import React from 'react';
import { motion } from 'framer-motion';

export interface MobileActionBarProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  helperText?: string;
  className?: string;
}

export function MobileActionBar({
  primaryLabel,
  onPrimaryClick,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondaryClick,
  helperText,
  className = '',
}: MobileActionBarProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 p-3 bg-[var(--m-surface-glass)] backdrop-blur-md border-t border-[var(--m-border)] shadow-[var(--m-shadow-sheet)] pb-[calc(var(--m-safe-bottom)+12px)] ${className}`}
    >
      <div className="max-w-[600px] mx-auto flex flex-col gap-2">
        {helperText && (
          <p className="text-center text-xs text-[var(--m-text-muted)]">{helperText}</p>
        )}
        <div className="flex items-center gap-2.5">
          {secondaryLabel && onSecondaryClick && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onSecondaryClick}
              className="flex-1 mobile-touch-target px-4 rounded-xl border border-[var(--m-border-strong)] bg-[var(--m-surface)] text-[var(--m-text-primary)] font-semibold text-[0.9375rem] shadow-sm"
            >
              {secondaryLabel}
            </motion.button>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onPrimaryClick}
            disabled={primaryDisabled || primaryLoading}
            className={`flex-[2] mobile-touch-target px-4 rounded-xl font-semibold text-[0.9375rem] text-white shadow-md transition-all ${
              primaryDisabled || primaryLoading
                ? 'bg-gray-400 opacity-60 cursor-not-allowed'
                : 'bg-[var(--m-brand-primary)] hover:bg-[var(--m-brand-bright)] active:bg-[var(--m-brand-deep)]'
            }`}
          >
            {primaryLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </span>
            ) : (
              primaryLabel
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
