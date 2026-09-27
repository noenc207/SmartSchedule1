import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  CheckSquare,
  CalendarRange,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface MobileNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { to: '/dashboard', label: 'Trang chủ', icon: Home },
  { to: '/calendar', label: 'Lịch học', icon: Calendar },
  { to: '/tasks', label: 'Công việc', icon: CheckSquare },
  { to: '/scheduling', label: 'Xếp lịch', icon: CalendarRange },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng trên thiết bị di động">
      <div className="mobile-bottom-nav-inner">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mobile-bottom-nav-item ${isActive ? 'active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="mobile-nav-icon-wrap">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.9} />
                    {item.badge && <span className="mobile-nav-badge">{item.badge}</span>}
                  </div>
                  <span className="mobile-nav-label">{item.label}</span>
                  {isActive && <span className="mobile-nav-active-dot" />}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
