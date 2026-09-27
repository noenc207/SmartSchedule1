import React from 'react';
import type { ChartYAxisConfig } from '../../types/dashboard';

interface ChartAxisProps {
  config: ChartYAxisConfig;
}

export function ChartAxis({ config }: ChartAxisProps) {
  // We render ticks from top to bottom
  const reversedTicks = [...config.ticks].reverse();

  return (
    <div className="chart-y-axis-container" aria-hidden="true">
      {reversedTicks.map((tick) => (
        <div
          key={tick.minutes}
          className="chart-y-tick-row"
          style={{ bottom: `${tick.ratio * 100}%` }}
        >
          <span className="chart-y-tick-label">{tick.label}</span>
          <div className="chart-grid-line" />
        </div>
      ))}
    </div>
  );
}
