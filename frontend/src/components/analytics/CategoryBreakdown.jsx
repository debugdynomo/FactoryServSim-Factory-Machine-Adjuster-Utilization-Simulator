import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, List } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * CategoryBreakdown — Person 6, Analytics Module
 *
 * Renders bar charts comparing metrics across machine categories
 * (e.g., Lathe, Turning, Drilling, Soldering).
 *
 * Charts:
 *   1. Category Utilization (%) — uptime comparison across categories
 *   2. Total Failures by Category — failure count comparison
 *
 * Data source: `simulationResults.category_metrics` from Person 2/3's simulation API.
 *
 * Props:
 *   - categoryMetrics: Array<{ category, utilization_pct, total_failures }>
 */

/** Color palette for category bars */
const CATEGORY_COLORS = [
  '#059669', // emerald
  '#1e3a5f', // steel blue
  '#d97706', // industrial amber
  '#0f172a', // deep navy
  '#64748b', // steel gray
  '#334155', // slate
  '#475569', // slate light
  '#0ea5e9', // sky blue
];

/**
 * Custom tooltip for category charts.
 */
function CategoryTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-medium mt-1">
          {entry.name}: {typeof entry.value === 'number' && entry.value % 1 !== 0
            ? entry.value.toFixed(1) + '%'
            : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/**
 * Transforms category_metrics to chart-friendly data format.
 * Sorts by utilization descending for visual clarity.
 */
function useCategoryData(categoryMetrics) {
  return useMemo(() => {
    if (!categoryMetrics || categoryMetrics.length === 0) return [];
    return [...categoryMetrics].sort((a, b) => b.utilization_pct - a.utilization_pct);
  }, [categoryMetrics]);
}

export default function CategoryBreakdown({ categoryMetrics = [] }) {
  const chartData = useCategoryData(categoryMetrics);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center text-slate-500">
        <BarChart3 size={48} className="text-slate-300 mb-4" />
        <p className="text-lg font-medium text-slate-700">Category Breakdown</p>
        <p className="text-sm mt-2">
          Run a simulation to see per-category utilization and failure metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Utilization by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <BarChart3 className="text-slate-800" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Machine Utilization by Category
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar
              dataKey="utilization_pct"
              name="Utilization"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`util-cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Failures by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <AlertTriangle className="text-rose-600" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Total Failures by Category
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis
              label={{ value: 'Failures', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar
              dataKey="total_failures"
              name="Total Failures"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`fail-cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 p-6 border-b border-gray-100">
          <List className="text-slate-800" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">
            Category Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Utilization (%)</th>
                <th className="px-6 py-4 text-right">Total Failures</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chartData.map((metric, index) => (
                <tr key={metric.category} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center">
                    <span
                      className="inline-block w-3 h-3 rounded-sm mr-3 shadow-sm"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    {metric.category}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">
                    {metric.utilization_pct.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">
                    {metric.total_failures.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${
                        metric.utilization_pct >= 90
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : metric.utilization_pct >= 75
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {metric.utilization_pct >= 90
                        ? 'Optimal'
                        : metric.utilization_pct >= 75
                        ? 'Adequate'
                        : 'Review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
