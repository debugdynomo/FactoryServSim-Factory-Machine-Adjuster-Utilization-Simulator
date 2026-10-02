import React, { useMemo } from 'react';
import { LineChart as LineChartIcon, TrendingUp, Activity } from 'lucide-react';
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
  machineUtilization: '#059669',   // emerald-600
  adjusterUtilization: '#1e3a5f',  // steel blue
  optimumLine: '#d97706',          // industrial amber
  grid: '#e2e8f0',                 // slate-200
};

/**
 * Custom tooltip for the utilization charts.
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-1">
        {label} Adjuster{label !== 1 ? 's' : ''}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-medium mt-1">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center text-slate-500">
        <LineChartIcon size={48} className="text-slate-300 mb-4" />
        <p className="text-lg font-medium text-slate-700">Utilization Charts</p>
        <p className="text-sm mt-2">
          Run an optimization to see utilization trends across different adjuster counts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Machine Utilization Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <Activity className="text-emerald-600" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Machine Utilization vs. Number of Adjusters
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10, fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                  fontWeight: 600
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.machineUtilization, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Adjuster Utilization Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <TrendingUp className="text-indigo-600" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Adjuster Utilization vs. Number of Adjusters
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10, fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                  fontWeight: 600
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.adjusterUtilization, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Combined Overview Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <LineChartIcon className="text-slate-800" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Combined Utilization Tradeoff
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10, fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                  fontWeight: 600
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.machineUtilization, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={3}
              dot={{ r: 4, fill: CHART_COLORS.adjusterUtilization, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
