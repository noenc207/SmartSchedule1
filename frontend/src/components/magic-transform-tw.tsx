import React, { useEffect, useRef, useState, useMemo, memo, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export interface MagicTransformDocument {
  id: string;
}

export interface MagicTransformResult {
  id: string;
  label: string;
  color: string;
  textColor?: string;
}

export interface MagicTransformClassNames {
  root?: string;
  document?: string;
  axis?: string;
  center?: string;
  result?: string;
  resultBody?: string;
  particle?: string;
}

export interface MagicTransformProps {
  documents?: MagicTransformDocument[];
  results?: MagicTransformResult[];
  height?: number | string;
  width?: number | string;
  documentDuration?: number;
  documentWidth?: number;
  documentHeight?: number;
  documentGap?: number;
  axisColor?: string;
  backgroundColor?: string;
  centerContent?: ReactNode;
  centerSize?: number;
  particleCount?: number;
  paused?: boolean;
  classNames?: MagicTransformClassNames;
  className?: string;
  style?: CSSProperties;
}

const KEYFRAMES_ID = 'magic-transform-doc-keyframes';
const KEYFRAMES_CSS = `@keyframes magic-transform-doc-slide {
  from { transform: translate3d(var(--mt-from), 0, 0); }
  to   { transform: translate3d(var(--mt-to), 0, 0); }
}`;

const DEFAULT_DOCUMENTS: MagicTransformDocument[] = [
  { id: 'doc-0' },
  { id: 'doc-1' },
  { id: 'doc-2' },
  { id: 'doc-3' },
];

const DEFAULT_RESULTS: MagicTransformResult[] = [
  { id: 'schedule', label: 'schedule', color: '#ea580c', textColor: '#ffffff' },
  { id: 'focus', label: 'focus block', color: '#c2410c', textColor: '#ffffff' },
  { id: 'recovery', label: 'buffer time', color: '#f97316', textColor: '#ffffff' },
  { id: 'optimal', label: '0 conflicts', color: '#047857', textColor: '#ffffff' },
  { id: 'balanced', label: '100% paced', color: '#fb923c', textColor: '#ffffff' },
];

const Squiggle = ({ width, amplitude = 1.6 }: { width: number; amplitude?: number }) => {
  const count = Math.max(8, Math.floor(width / 6));
  const step = width / count;
  let d = `M 0 ${amplitude}`;
  for (let i = 0; i < count; i++) {
    const cp1x = i * step + 0.25 * step;
    const cp1y = i % 2 === 0 ? 0 : 2 * amplitude;
    const cp2x = i * step + 0.75 * step;
    const cp2y = i % 2 === 0 ? 2 * amplitude : 0;
    const endX = (i + 1) * step;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${amplitude}`;
  }
  return (
    <svg
      width={width}
      height={2 * amplitude + 1}
      viewBox={`0 0 ${width} ${2 * amplitude + 1}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke="#ea580c" strokeOpacity={0.35} strokeWidth={0.9} />
    </svg>
  );
};

const NoiseGrid = ({ width, height }: { width: number; height: number }) => {
  const cols = Math.floor(width / 4);
  const rows = Math.floor(height / 4);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${4 * cols} ${4 * rows}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const rand = (Math.sin(12.9898 * r + 78.233 * c) * 43758.5453) % 1;
          const positive = (rand + 1) % 1;
          return positive > 0.5 ? (
            <rect key={`${r}-${c}`} x={4 * c} y={4 * r} width={3} height={3} fill="#fed7aa" opacity={0.65} />
          ) : null;
        })
      )}
    </svg>
  );
};

const DocumentContent = memo(function DocumentContent({
  seed,
  variant,
  width,
  height,
}: {
  seed: number;
  variant: 'letter' | 'image';
  width: number;
  height: number;
}) {
  const rand = useMemo(() => (t: number) => {
    const v = 233280 * Math.sin(9301 * seed + 49297 * t);
    return v - Math.floor(v);
  }, [seed]);

  const innerW = width - 32;

  if (variant === 'image') {
    const imgH = Math.floor(0.42 * height);
    return (
      <div className="flex h-full w-full flex-col gap-1.5 overflow-hidden p-4">
        <div className="mb-2 h-1.5 w-1/4 rounded-[1px] bg-orange-400/80" />
        <div className="overflow-hidden">
          <NoiseGrid width={innerW} height={imgH} />
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Squiggle key={i} width={innerW * (0.78 + 0.2 * rand(i))} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-1.5 overflow-hidden p-4">
      <div className="mb-2 h-1.5 w-1/4 rounded-[1px] bg-orange-400/80" />
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Squiggle key={`p1-${i}`} width={innerW * (0.7 + 0.28 * rand(i))} />
        ))}
      </div>
      <div className="my-1.5 flex gap-2">
        <div className="h-3 w-[36%] rounded-[2px] border border-orange-200" />
        <div className="h-3 w-[18%] rounded-[2px] border border-orange-200" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Squiggle key={`p2-${i}`} width={innerW * (0.7 + 0.28 * rand(i + 30))} />
        ))}
      </div>
      <div className="my-1.5 flex gap-2">
        <div className="h-3 w-[28%] rounded-[2px] border border-orange-200" />
        <div className="h-2.5 w-[24%] rounded-[1px] bg-orange-100" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Squiggle key={`p3-${i}`} width={innerW * (0.7 + 0.28 * rand(i + 60))} />
        ))}
      </div>
    </div>
  );
});

const ResultBody = () => (
  <div className="flex flex-col gap-[3px] rounded-md border border-amber-200 bg-white/95 p-2 shadow-[0_2px_8px_rgba(234,88,12,0.06)]">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="grid grid-cols-3 gap-[3px]">
        <div className="h-1.5 rounded-[1px] bg-amber-100" />
        <div className="col-span-2 h-1.5 rounded-[1px] bg-amber-50" />
      </div>
    ))}
  </div>
);

const SlidingDocument = memo(function SlidingDocument({
  index,
  total,
  beat,
  variant,
  documentWidth,
  documentHeight,
  documentGap,
  centerX,
  paused,
  className,
}: {
  index: number;
  total: number;
  beat: number;
  variant: 'letter' | 'image';
  documentWidth: number;
  documentHeight: number;
  documentGap: number;
  centerX: number;
  paused: boolean;
  className?: string;
}) {
  const fromX = centerX - total * (documentWidth + documentGap);
  const toX = centerX + documentWidth + documentGap;
  const style: React.CSSProperties & Record<string, any> = {
    width: documentWidth,
    height: documentHeight,
    top: 0,
    left: 0,
    position: 'absolute',
    willChange: 'transform',
    '--mt-from': `${fromX}px`,
    '--mt-to': `${toX}px`,
    animationName: 'magic-transform-doc-slide',
    animationDuration: `${beat * total}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDelay: `${-index * beat}s`,
    animationPlayState: paused ? 'paused' : 'running',
    transform: paused ? `translate3d(${fromX}px, 0, 0)` : undefined,
  };

  return (
    <div className={className} style={style}>
      <DocumentContent seed={index + 1} variant={variant} width={documentWidth} height={documentHeight} />
    </div>
  );
});

const DefaultCenterSymbol = ({ size = 32 }: { size?: number }) => (
  <div
    className="flex items-center justify-center font-bold text-xs tracking-wider uppercase text-white rounded-md bg-gradient-to-br from-orange-600 to-amber-500 shadow-sm"
    style={{ width: size, height: size }}
  >
    AI
  </div>
);

/**
 * MagicTransform — React Bits Pro (@reactbits-starter/magic-transform-tw)
 *
 * "Documents fly in and come out as colorful results"
 *
 * Implements the official React Bits Pro component architecture:
 * - Documents stream horizontally through the transformation axis
 * - Pulses of confetti particles and colorful result chips emit as documents pass through
 * - Re-themed with SmartSchedule's White x FPTU Orange design tokens
 */
export function MagicTransform({
  documents = DEFAULT_DOCUMENTS,
  results = DEFAULT_RESULTS,
  height = 560,
  width = '100%',
  documentDuration = 4,
  documentWidth = 220,
  documentHeight = 320,
  documentGap = 60,
  axisColor = '#ea580c',
  backgroundColor = 'transparent',
  centerContent,
  centerSize = 56,
  particleCount = 18,
  classNames,
  paused = false,
  className,
  style,
}: MagicTransformProps) {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(KEYFRAMES_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = KEYFRAMES_ID;
    styleEl.textContent = KEYFRAMES_CSS;
    document.head.appendChild(styleEl);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    let timer: any = null;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setContainerWidth((prev) => (Math.abs(prev - w) < 1 ? prev : w));
      }, 100);
    });
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const totalDocs = Math.max(1, documents.length);
  const centerX = containerWidth / 2;
  const [pulseCount, setPulseCount] = useState(0);
  const startTimeRef = useRef(0);
  const cycleKey = useMemo(
    () => `${documentDuration}|${documentWidth}|${documentGap}|${totalDocs}|${centerX}`,
    [documentDuration, documentWidth, documentGap, totalDocs, centerX]
  );

  useEffect(() => {
    if (paused || containerWidth <= 0) return;
    startTimeRef.current = performance.now();
    const loopDuration = documentDuration * totalDocs;
    const totalSpan = (totalDocs + 1) * (documentWidth + documentGap);
    const offset = ((totalDocs * (documentWidth + documentGap) - documentWidth) / totalSpan) * loopDuration;

    let intervalId: any = null;
    const elapsed = (performance.now() - startTimeRef.current) / 1000 - offset;
    const remainder = ((elapsed % documentDuration) + documentDuration) % documentDuration;
    const initialDelay = remainder < 0.001 ? documentDuration : documentDuration - remainder;

    const timeoutId = setTimeout(() => {
      setPulseCount((c) => c + 1);
      intervalId = setInterval(() => {
        setPulseCount((c) => c + 1);
      }, documentDuration * 1000);
    }, initialDelay * 1000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [paused, containerWidth, documentDuration, totalDocs, documentWidth, documentGap, cycleKey]);

  const centerOffset = centerSize / 2 + 40;
  const pausedPositions = useMemo(
    () => [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: 2 },
      { col: 1, row: 2 },
    ],
    []
  );

  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < particleCount; i++) {
      const res = results[i % results.length];
      const seed = 9301 * i;
      const rand = (t: number) => {
        const v = 233280 * Math.sin(seed + 49297 * t);
        return v - Math.floor(v);
      };
      const angle = (rand(1) - 0.5) * 1.4;
      const distance = 90 + 230 * rand(2);
      list.push({
        id: i,
        color: res.color,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance * 0.65,
        rot: (rand(3) - 0.5) * 360,
        size: 8 + Math.floor(8 * rand(4)),
        microDelay: 0.12 * rand(5),
      });
    }
    return list;
  }, [particleCount, results]);

  const containerStyle: CSSProperties = {
    width,
    height,
    background: backgroundColor,
    ...style,
  };

  const isActive = pulseCount > 0 && !paused;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-2xl', classNames?.root, className)}
      style={containerStyle}
    >
      {/* 1. Left Stream: Documents Sliding In */}
      {containerWidth > 0 && (
        <div
          className="pointer-events-none absolute z-10 overflow-hidden"
          style={{
            left: 0,
            width: centerX,
            top: `calc(50% - ${documentHeight / 2}px)`,
            height: documentHeight,
          }}
          aria-hidden="true"
        >
          {documents.map((doc, i) => (
            <SlidingDocument
              key={doc.id}
              index={i}
              total={totalDocs}
              beat={documentDuration}
              variant={i % 2 === 0 ? 'letter' : 'image'}
              documentWidth={documentWidth}
              documentHeight={documentHeight}
              documentGap={documentGap}
              centerX={centerX}
              paused={paused}
              className={cn(
                'rounded-[14px] border border-orange-200/90 bg-white/95 shadow-[0_8px_32px_rgba(234,88,12,0.08)]',
                classNames?.document
              )}
            />
          ))}
        </div>
      )}

      {/* 2. Central Transformation Axis & Halo */}
      <div
        className={cn('pointer-events-none absolute z-20', classNames?.axis)}
        style={{
          width: 56,
          height: documentHeight,
          left: '50%',
          top: '50%',
          transform: 'translate(-100%, -50%)',
          background: `linear-gradient(90deg, transparent 0%, ${axisColor}12 60%, ${axisColor}25 100%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute z-20"
        style={{
          width: 2,
          height: documentHeight,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: axisColor,
          boxShadow: `0 0 14px ${axisColor}`,
        }}
        aria-hidden="true"
      />

      {/* 3. Center Pulse Badge */}
      <motion.div
        key={`center-${pulseCount}`}
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 z-30 flex items-center justify-center rounded-[14px] bg-white p-2 text-neutral-900 border border-orange-200/80',
          classNames?.center
        )}
        style={{
          width: centerSize,
          height: centerSize,
          translate: '-50% -50%',
        }}
        initial={{ scale: 1, boxShadow: `0 10px 40px ${axisColor}33` }}
        animate={
          pulseCount === 0
            ? undefined
            : {
                scale: [1, 1.15, 1],
                boxShadow: [`0 10px 40px ${axisColor}33`, `0 10px 60px ${axisColor}AA`, `0 10px 40px ${axisColor}33`],
              }
        }
        transition={{
          duration: Math.min(0.6, 0.5 * documentDuration),
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.25, 1],
        }}
      >
        {centerContent ?? <DefaultCenterSymbol size={centerSize - 20} />}
      </motion.div>

      {/* 4. Confetti Particles Burst */}
      {containerWidth > 0 && isActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
          {particles.map((p) => {
            const dur = Math.min(1.2 * documentDuration, 2.4);
            return (
              <motion.div
                key={p.id}
                className={cn('absolute', classNames?.particle)}
                style={{
                  left: 0,
                  top: 0,
                  width: p.size,
                  height: p.size,
                  translate: '-50% -50%',
                  willChange: 'transform, opacity',
                }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.2 }}
                animate={{
                  x: p.dx,
                  y: p.dy,
                  rotate: p.rot,
                  scale: 1,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  default: { duration: dur, ease: [0.16, 1, 0.3, 1], delay: p.microDelay },
                  opacity: { duration: dur, times: [0, 0.12, 0.5, 1], ease: 'easeOut', delay: p.microDelay },
                }}
              >
                <div
                  className="h-full w-full rounded-[3px]"
                  style={{ background: p.color, boxShadow: `0 1px 4px ${p.color}66` }}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. Right Stream: Colorful Result Cards Emitter */}
      {containerWidth > 0 && isActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
          {results.map((res, idx) => {
            const count = results.length;
            const norm = ((count === 1 ? 0.5 : idx / (count - 1)) - 0.5) * 1.1 + ((53 * idx) % 11 - 5) / 60;
            const dist = 240 + ((23 * idx) % 60);
            const targetX = Math.cos(norm) * dist + 0.4 * centerOffset;
            const targetY = Math.sin(norm) * dist;
            const rot = ((53 * idx) % 30) - 15;
            const delay = (0.025 * idx) % 0.12;
            const dur = Math.min(1.1 * documentDuration, 2.4);

            return (
              <motion.div
                key={res.id}
                className={cn('absolute flex w-[170px] flex-col gap-1.5', classNames?.result)}
                style={{
                  left: 0,
                  top: 0,
                  transformOrigin: '0% 50%',
                  willChange: 'transform, opacity',
                }}
                initial={{ x: 0, y: 0, rotate: rot, opacity: 0, scale: 0.3 }}
                animate={{
                  x: targetX,
                  y: targetY,
                  rotate: 0.25 * rot,
                  scale: 1,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  default: { duration: dur, ease: [0.16, 1, 0.3, 1], delay },
                  opacity: { duration: dur, times: [0, 0.1, 0.55, 1], ease: 'easeOut', delay },
                }}
              >
                <div
                  className="flex items-center px-2.5 h-6 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: res.color }}
                >
                  {res.label}
                </div>
                <div className={cn(classNames?.resultBody)}>
                  <ResultBody />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. Static Fallback When Paused */}
      {containerWidth > 0 && paused && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
          {results.map((res, idx) => {
            const pos = pausedPositions[idx] ?? { col: idx % 2, row: Math.floor(idx / 2) };
            const posX = centerOffset + 200 * pos.col;
            const posY = -150 + 130 * pos.row;

            return (
              <div
                key={res.id}
                className={cn('absolute flex w-[170px] flex-col gap-1.5', classNames?.result)}
                style={{
                  left: 0,
                  top: 0,
                  transform: `translate(${posX}px, ${posY}px)`,
                }}
              >
                <div
                  className="flex items-center px-2.5 h-6 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: res.color }}
                >
                  {res.label}
                </div>
                <div className={cn(classNames?.resultBody)}>
                  <ResultBody />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MagicTransform;
