import React from 'react';

interface ChartLegendProps {
  fixedHours?: string;
  plannedHours?: string;
  avgCapacityHours?: string;
}

export function ChartLegend({ fixedHours, plannedHours, avgCapacityHours }: ChartLegendProps) {
  return (
    <div className="workload-chart-legend" role="list" aria-label="Chú thích biểu đồ">
      <div className="legend-item" role="listitem">
        <span className="legend-dot fixed" />
        <span className="legend-text">Tiết học cố định trên lớp</span>
        {fixedHours && <span className="legend-metric-tag fixed-tag">{fixedHours}</span>}
      </div>

      <div className="legend-item" role="listitem">
        <span className="legend-dot planned" />
        <span className="legend-text">Buổi tự học đã lên lịch</span>
        {plannedHours && <span className="legend-metric-tag planned-tag">{plannedHours}</span>}
      </div>

      <div className="legend-item" role="listitem">
        <span className="legend-line capacity" />
        <span className="legend-text">Hạn mức an toàn</span>
        {avgCapacityHours && (
          <span className="legend-metric-tag capacity-tag">TB {avgCapacityHours}/ngày</span>
        )}
      </div>
    </div>
  );
}
