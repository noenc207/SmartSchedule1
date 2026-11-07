import React from 'react';
import { getStreakAsset } from '../assets';

export interface StreakBadgeProps {
  days: number;
  isFrozen?: boolean;
  isBroken?: boolean;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showCounter?: boolean;
  counterPosition?: 'right' | 'bottom' | 'badge';
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 88,
};

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  days,
  isFrozen = false,
  isBroken = false,
  size = 'md',
  showCounter = true,
  counterPosition = 'right',
  className = '',
  onClick,
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const assetUrl = getStreakAsset(days, isFrozen, isBroken);

  const getLabel = () => {
    if (isBroken) return 'Chuỗi đã ngắt';
    if (isFrozen) return `Bảo vệ chuỗi (${days} ngày)`;
    return `${days} ngày liên tục`;
  };

  const getGlow = () => {
    if (isBroken) return 'rgba(100, 116, 139, 0.3)';
    if (isFrozen) return 'rgba(56, 189, 248, 0.5)';
    if (days >= 100) return 'rgba(234, 88, 12, 0.6)';
    if (days >= 30) return 'rgba(245, 158, 11, 0.55)';
    return 'rgba(249, 115, 22, 0.45)';
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${
        counterPosition === 'bottom' ? 'flex-col' : 'flex-row'
      } ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={getLabel()}
    >
      <div
        className="relative flex items-center justify-center transition-transform hover:scale-105 duration-200"
        style={{
          width: pixelSize,
          height: pixelSize,
          filter: `drop-shadow(0 2px 8px ${getGlow()})`,
        }}
      >
        <img
          src={assetUrl}
          alt={getLabel()}
          className="w-full h-full object-contain pointer-events-none"
          loading="lazy"
        />

        {showCounter && counterPosition === 'badge' && !isBroken && (
          <span
            className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-black rounded-full px-1.5 py-0.2 text-[10px] shadow-md border border-white"
          >
            {days}
          </span>
        )}
      </div>

      {showCounter && counterPosition !== 'badge' && (
        <span
          className={`font-black tracking-tight ${
            isBroken
              ? 'text-slate-400 line-through'
              : isFrozen
              ? 'text-sky-500'
              : 'text-orange-600'
          }`}
          style={{
            fontSize: Math.max(12, Math.round(pixelSize * 0.45)),
            lineHeight: 1,
          }}
        >
          {days}
          <span className="text-[10px] font-semibold ml-0.5 uppercase tracking-normal opacity-70">
            {isBroken ? 'off' : 'd'}
          </span>
        </span>
      )}
    </div>
  );
};

export default StreakBadge;
