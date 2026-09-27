import React, { useState, useEffect } from 'react';

interface CurrentTimeIndicatorProps {
  currentDate?: Date;
}

export function CurrentTimeIndicator({ currentDate }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="current-time-indicator-rail" aria-label={`Thời gian hiện tại: ${timeString}`}>
      <div className="now-badge">
        <span className="now-dot" />
        <span>HIỆN TẠI · {timeString}</span>
      </div>
      <div className="now-line" />
    </div>
  );
}
