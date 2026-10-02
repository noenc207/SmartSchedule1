import React from 'react';
import type { MascotState } from '../../stores/aiChatStore';

interface AIMascotProps {
  state?: MascotState;
  size?: number;
  className?: string;
}

export function AIMascot({ state = 'IDLE', size = 52, className = '' }: AIMascotProps) {
  // Use thinking mascot image when thinking, else crisp chat mascot
  const mascotSrc = state === 'THINKING' ? '/mascot-thinking.png' : '/mascot-chat.png';

  return (
    <div
      className={`ai-mascot-wrapper state-${state.toLowerCase()} ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={mascotSrc}
        alt="SmartSchedule AI Assistant Mascot"
        className="ai-mascot-img"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: state === 'ERROR' ? 'grayscale(0.3) saturate(0.8)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onError={(e) => {
          // Fallback if image fails to load for any reason
          const target = e.currentTarget;
          if (!target.src.includes('mascot_thumbsup.png')) {
            target.src = '/banner/mascot_thumbsup.png';
          }
        }}
      />
      {state === 'THINKING' && (
        <span className="ai-mascot-thinking-halo" />
      )}
    </div>
  );
}
