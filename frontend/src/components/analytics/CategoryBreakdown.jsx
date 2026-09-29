import React, { useMemo } from 'react';
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
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
];

/**
 * Custom tooltip for category charts.
 */
function CategoryTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
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
      <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-400">
        <p className="text-lg">📊 Category Breakdown</p>
        <p className="text-sm mt-2">
          Run a simulation to see per-category utilization and failure metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Utilization by Category */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📊 Machine Utilization by Category
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CategoryTooltip />} />
            <Legend />
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🔧 Total Failures by Category
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis
              label={{ value: 'Failures', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CategoryTooltip />} />
            <Legend />
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
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Summary Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📋 Category Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Utilization (%)</th>
                <th className="px-4 py-3 text-right">Total Failures</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chartData.map((metric, index) => (
                <tr key={metric.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    {metric.category}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {metric.utilization_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {metric.total_failures.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        metric.utilization_pct >= 90
                          ? 'bg-green-100 text-green-700'
                          : metric.utilization_pct >= 75
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {metric.utilization_pct >= 90
                        ? 'Excellent'
                        : metric.utilization_pct >= 75
                        ? 'Good'
                        : 'Needs Attention'}
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
