import React from 'react';

export interface MobileSectionProps {
  title?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noCard?: boolean;
}

export function MobileSection({
  title,
  eyebrow,
  action,
  children,
  className = '',
  noCard = false,
}: MobileSectionProps) {
  return (
    <section className={`mb-5 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="flex items-end justify-between mb-2.5 px-0.5">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-brand-primary)] mb-0.5">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-[1.05rem] font-bold text-[var(--m-text-primary)] tracking-tight">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="text-xs font-semibold text-[var(--m-brand-primary)]">{action}</div>}
        </div>
      )}

      {noCard ? children : <div className="mobile-card flex flex-col gap-3">{children}</div>}
    </section>
  );
}
