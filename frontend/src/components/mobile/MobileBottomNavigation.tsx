import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Calendar,
  CheckSquare,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface MobileNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

export const MOBILE_MAIN_NAV: MobileNavItem[] = [
  { to: '/dashboard', label: 'Trang chủ', icon: Home },
  { to: '/calendar', label: 'Lịch học', icon: Calendar },
  { to: '/tasks', label: 'Công việc', icon: CheckSquare },
  { to: '/ai', label: 'Cóc AI', icon: Sparkles },
  { to: '/settings', label: 'Hồ sơ', icon: Settings },
];

export function MobileBottomNavigation({ items = MOBILE_MAIN_NAV }: { items?: MobileNavItem[] }) {
  const location = useLocation();

  return (
    <nav className="mobile-nav-bar" aria-label="Thanh điều hướng di động chính">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.to ||
          (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`mobile-nav-tab ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="mobileNavActiveIndicator"
                className="mobile-nav-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <motion.div
              whileTap={{ scale: 0.88 }}
              className="relative flex items-center justify-center p-1"
            >
              <Icon
                size={21}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-[var(--m-brand-primary)]' : 'text-[var(--m-text-muted)]'}
              />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-[var(--m-brand-primary)] text-white text-[10px] font-bold rounded-full min-w-[16px] text-center leading-4 shadow-sm">
                  {item.badge}
                </span>
              )}
            </motion.div>
            <span
              className={`mobile-nav-tab-label ${
                isActive ? 'text-[var(--m-brand-primary)] font-bold' : 'text-[var(--m-text-muted)]'
              }`}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
