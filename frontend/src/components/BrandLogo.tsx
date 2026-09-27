import React from 'react';

export function BrandMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  // Official FPT 3-color identity: Orange (#F27024), Blue (#0047BA), Green (#009A3E)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-mark-svg ${className}`}
      aria-label="FPT University Quy Nhơn SmartSchedule Mark"
    >
      <rect width="40" height="40" rx="9" fill="var(--surface-elevated, #ffffff)" stroke="var(--border)" strokeWidth="1" />
      {/* 3 characteristic FPT curved arches */}
      <path
        d="M9 29C9 20.7157 15.7157 14 24 14H29V19H24C18.4772 19 14 23.4772 14 29H9Z"
        fill="#0047BA"
      />
      <path
        d="M13 29C13 22.9249 17.9249 18 24 18H28V23H24C20.6863 23 18 25.6863 18 29H13Z"
        fill="#F27024"
      />
      <path
        d="M17 29C17 25.134 20.134 22 24 22H27V26H24C22.3431 26 21 27.3431 21 29H17Z"
        fill="#009A3E"
      />
      <circle cx="28" cy="12" r="3" fill="#F27024" />
    </svg>
  );
}

export function BrandLogo({
  collapsed = false,
  onClick,
}: {
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className="brand-logo-container mock-sidebar-logo"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <img
        src="/fpt-icon.png"
        alt="FPT"
        className="mock-fpt-brand-mark"
        style={{ height: collapsed ? 24 : 32, objectFit: 'contain' }}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
      {!collapsed && (
        <div className="brand-logo-text mock-brand-text">
          <strong className="mock-brand-title">FPT UNIVERSITY</strong>
          <span className="mock-brand-sub">QUY NHƠN AI CAMPUS</span>
        </div>
      )}
    </div>
  );
}
