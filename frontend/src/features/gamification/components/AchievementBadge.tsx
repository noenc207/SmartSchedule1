import React from 'react';
import { ACHIEVEMENT_ASSETS, AchievementId } from '../assets';

export interface AchievementBadgeProps {
  id: AchievementId;
  unlocked?: boolean;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 36,
  md: 52,
  lg: 76,
  xl: 108,
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  id,
  unlocked = true,
  size = 'md',
  showName = false,
  className = '',
  onClick,
}) => {
  const meta = ACHIEVEMENT_ASSETS[id] || ACHIEVEMENT_ASSETS['first-streak'];
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={`${meta.name}: ${meta.description}${unlocked ? '' : ' (Chưa mở khóa)'}`}
    >
      <div
        className={`relative flex items-center justify-center transition-all duration-200 ${
          unlocked ? 'hover:scale-105' : 'grayscale opacity-40 hover:opacity-60'
        }`}
        style={{
          width: pixelSize,
          height: pixelSize,
          filter: unlocked
            ? 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.35))'
            : 'grayscale(100%) opacity(40%)',
        }}
      >
        <img
          src={meta.assetPath}
          alt={meta.name}
          className="w-full h-full object-contain pointer-events-none"
          loading="lazy"
        />
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-slate-600 drop-shadow"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {showName && (
        <span
          className={`mt-1.5 font-bold text-xs text-center line-clamp-1 max-w-[120px] ${
            unlocked ? 'text-slate-800' : 'text-slate-400'
          }`}
        >
          {meta.name}
        </span>
      )}
    </div>
  );
};

export default AchievementBadge;
