import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  leftAction,
  rightAction,
  badge,
  className = '',
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`mobile-header ${className}`} role="banner">
      <div className="flex items-center gap-2 min-w-0">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="mobile-touch-target -ml-2 p-2 rounded-full text-[var(--m-text-primary)] hover:bg-[var(--m-surface-subtle)] active:scale-95 transition-transform"
            aria-label="Quay lại"
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          leftAction
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="mobile-header-title truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && <span className="mobile-header-subtitle truncate">{subtitle}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">{rightAction}</div>
    </header>
  );
}
