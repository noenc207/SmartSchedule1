import React, { useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

export interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string;
  showCloseButton?: boolean;
}

export function MobileSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = '88dvh',
  showCloseButton = true,
}: MobileSheetProps) {
  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="mobile-sheet-backdrop"
            aria-hidden="true"
          />

          {/* Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            style={{ maxHeight }}
            className="mobile-sheet-content"
            role="dialog"
            aria-modal="true"
          >
            {/* Grabber Handle */}
            <div className="mobile-sheet-handle" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-[var(--m-border)]">
                <div className="min-w-0 pr-3">
                  {typeof title === 'string' ? (
                    <h2 className="text-[1.1rem] font-bold text-[var(--m-text-primary)] tracking-tight truncate">
                      {title}
                    </h2>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    <p className="text-xs text-[var(--m-text-secondary)] mt-0.5 truncate">{subtitle}</p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="mobile-touch-target p-2 rounded-full text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)] active:scale-95 transition-transform"
                    aria-label="Đóng"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Content Scroll */}
            <div className="mobile-sheet-scroll">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-5 pt-3 pb-1 border-t border-[var(--m-border)] bg-[var(--m-surface)]">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
