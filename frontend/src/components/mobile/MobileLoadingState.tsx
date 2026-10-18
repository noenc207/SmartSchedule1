import React from 'react';

export interface MobileLoadingStateProps {
  count?: number;
  type?: 'cards' | 'list' | 'timeline';
  className?: string;
}

export function MobileLoadingState({
  count = 3,
  type = 'cards',
  className = '',
}: MobileLoadingStateProps) {
  return (
    <div
      role="status"
      aria-label="Đang tải nội dung..."
      className={`flex flex-col gap-3.5 w-full my-2 animate-pulse ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--m-surface)] rounded-2xl border border-[var(--m-border)] p-4 flex flex-col gap-2.5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-[var(--m-border)] rounded-md w-1/3" />
            <div className="h-4 bg-[var(--m-border)] rounded-full w-12" />
          </div>
          <div className="h-5 bg-[var(--m-border-strong)] opacity-60 rounded-md w-3/4" />
          <div className="flex items-center gap-2 mt-1">
            <div className="h-3 bg-[var(--m-border)] rounded-md w-1/4" />
            <div className="h-3 bg-[var(--m-border)] rounded-md w-1/5" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải dữ liệu...</span>
    </div>
  );
}
