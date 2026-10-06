import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

/**
 * UtilizationCharts — Person 6, Analytics Module
 *
 * Renders two interactive line charts:
 *   1. Machine Utilization (%) vs. Number of Adjusters
 *   2. Adjuster Utilization (%) vs. Number of Adjusters
 *
 * Data source: `optimizationResults.tradeoff_curve` from Person 2/3's optimizer API.
 *
 * Props:
 *   - tradeoffCurve: Array<{ adjuster_count, machine_utilization, adjuster_utilization }>
 *   - optimumCount: number | null — the recommended optimum adjuster count
 */

const CHART_COLORS = {
  machineUtilization: '#10b981',   // emerald-500
  adjusterUtilization: '#6366f1',  // indigo-500
  optimumLine: '#e94560',          // factory highlight red
  grid: '#e5e7eb',                 // gray-200
};

/**
 * Custom tooltip for the utilization charts.
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">
        {label} Adjuster{label !== 1 ? 's' : ''}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

/**
 * Formats a tradeoff_curve array into chart-ready data.
 * Ensures data is sorted by adjuster_count for a smooth line.
 */
function useChartData(tradeoffCurve) {
  return useMemo(() => {
    if (!tradeoffCurve || tradeoffCurve.length === 0) return [];
    return [...tradeoffCurve].sort((a, b) => a.adjuster_count - b.adjuster_count);
  }, [tradeoffCurve]);
}

export default function UtilizationCharts({ tradeoffCurve = [], optimumCount = null }) {
  const chartData = useChartData(tradeoffCurve);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-400">
        <p className="text-lg">📊 Utilization Charts</p>
        <p className="text-sm mt-2">
          Run an optimization to see utilization trends across different adjuster counts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Machine Utilization Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🏭 Machine Utilization vs. Number of Adjusters
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeDasharray="5 5"
                label={{
                  value: `Optimum: ${optimumCount}`,
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_COLORS.machineUtilization }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Adjuster Utilization Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🔧 Adjuster Utilization vs. Number of Adjusters
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeDasharray="5 5"
                label={{
                  value: `Optimum: ${optimumCount}`,
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_COLORS.adjusterUtilization }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Combined Overview Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📈 Combined Utilization Tradeoff
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeDasharray="5 5"
                label={{
                  value: `Optimum: ${optimumCount}`,
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_COLORS.machineUtilization }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_COLORS.adjusterUtilization }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
