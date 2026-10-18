import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileBottomNavigation } from '../../components/mobile';

export function MobileWebShell() {
  return (
    <div className="mobile-app-shell">
      <Outlet />
      <MobileBottomNavigation />
    </div>
  );
}
