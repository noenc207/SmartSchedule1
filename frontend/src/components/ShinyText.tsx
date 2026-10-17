import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

/**
 * ShinyText — React Bits Public Component
 * Shimmering linear gradient sweep across typography.
 * Free & Open Source (MIT License) - React Bits
 */
export default function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className = '',
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${disabled ? '' : 'animate-shine'} ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(234,88,12,0.9) 0%, rgba(251,191,36,1) 50%, rgba(234,88,12,0.9) 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        animationDuration,
      }}
    >
      {text}
    </span>
  );
}
