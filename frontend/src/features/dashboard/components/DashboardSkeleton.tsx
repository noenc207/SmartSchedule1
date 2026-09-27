import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton-container" aria-busy="true" aria-label="Loading dashboard...">
      {/* Header skeleton */}
      <div className="skeleton-header-box">
        <div className="skeleton-line sm w-32" />
        <div className="skeleton-line lg w-64" style={{ margin: '12px 0 8px' }} />
        <div className="skeleton-line md w-96" />
      </div>

      {/* KPI row skeleton */}
      <div className="dashboard-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-metric-card skeleton-card">
            <div className="skeleton-line sm w-24" />
            <div className="skeleton-line lg w-16" style={{ margin: '8px 0' }} />
            <div className="skeleton-line sm w-32" />
          </div>
        ))}
      </div>

      {/* Main Grid: Schedule + Workload */}
      <div className="dashboard-main-grid">
        <div className="panel dashboard-card skeleton-card">
          <div className="skeleton-line md w-48" style={{ marginBottom: 16 }} />
          <div className="skeleton-block h-64" />
        </div>
        <div className="panel dashboard-card skeleton-card">
          <div className="skeleton-line md w-48" style={{ marginBottom: 16 }} />
          <div className="skeleton-block h-64" />
        </div>
      </div>

      {/* Deadlines skeleton */}
      <div className="panel dashboard-card skeleton-card" style={{ marginTop: 24 }}>
        <div className="skeleton-line md w-48" style={{ marginBottom: 16 }} />
        <div className="skeleton-line sm w-full" style={{ marginBottom: 8 }} />
        <div className="skeleton-line sm w-full" style={{ marginBottom: 8 }} />
        <div className="skeleton-line sm w-full" />
      </div>
    </div>
  );
}
