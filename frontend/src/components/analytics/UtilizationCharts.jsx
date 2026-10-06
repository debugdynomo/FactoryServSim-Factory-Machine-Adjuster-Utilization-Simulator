import React, { useMemo } from 'react';
import { Factory, Wrench } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

/**
 * UtilizationCharts — Person 6, Analytics Module
 */

const CHART_COLORS = {
  machineUtilization: '#475569',   // slate-600
  adjusterUtilization: '#64748b',  // slate-500
  optimumLine: '#2563eb',          // blue-600
  grid: '#f1f5f9',                 // slate-100
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-[4px] px-3 py-2 text-[12px] shadow-lg">
      <p className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">
        {label} Adjusters
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {entry.name}: <span className="font-semibold text-slate-900">{entry.value.toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
}

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
      <div className="bg-white border border-slate-200 rounded-[6px] p-6 text-center text-slate-400">
        <p className="text-[14px] font-medium">No utilization data available</p>
        <p className="text-[12px] mt-1">Run an optimization to view charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Machine Utilization Chart */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Factory className="w-4 h-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-900">Machine Utilization vs. Adjusters</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeWidth={1}
                label={{
                  value: 'Recommended',
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.machineUtilization, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Adjuster Utilization Chart */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-4 h-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-900">Adjuster Utilization vs. Adjusters</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeWidth={1}
                label={{
                  value: 'Recommended',
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.adjusterUtilization, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Combined Overview Chart */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[14px] font-semibold text-slate-900">Combined Utilization Tradeoff</h3>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="adjuster_count"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            {optimumCount && (
              <ReferenceLine
                x={optimumCount}
                stroke={CHART_COLORS.optimumLine}
                strokeWidth={1}
                label={{
                  value: 'Recommended',
                  position: 'top',
                  fill: CHART_COLORS.optimumLine,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="machine_utilization"
              name="Machine Utilization"
              stroke={CHART_COLORS.machineUtilization}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.machineUtilization, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="adjuster_utilization"
              name="Adjuster Utilization"
              stroke={CHART_COLORS.adjusterUtilization}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.adjusterUtilization, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
