import React from 'react';
import { RANK_ASSETS, RankTier } from '../assets';

export interface RankBadgeProps {
  tier: RankTier;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
  className?: string;
  showTitle?: boolean;
  onClick?: () => void;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 108,
};

export const RankBadge: React.FC<RankBadgeProps> = ({
  tier,
  size = 'md',
  showGlow = false,
  className = '',
  showTitle = false,
  onClick,
}) => {
  const meta = RANK_ASSETS[tier] || RANK_ASSETS.bronze;
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={meta.title}
    >
      <div
        className="relative flex items-center justify-center transition-transform hover:scale-105 duration-200"
        style={{
          width: pixelSize,
          height: pixelSize,
          filter: showGlow ? `drop-shadow(0 0 ${Math.max(6, pixelSize * 0.12)}px ${meta.glowColor})` : undefined,
        }}
      >
        <img
          src={meta.assetPath}
          alt={meta.title}
          className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
          loading="lazy"
        />
      </div>
      {showTitle && (
        <span
          className="mt-1 font-bold text-xs tracking-wide"
          style={{ color: meta.color }}
        >
          {meta.title}
        </span>
      )}
    </div>
  );
};

export default RankBadge;
