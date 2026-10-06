import React, { useMemo } from 'react';
import { BarChart2, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * CategoryBreakdown — Person 6, Analytics Module
 */

function CategoryTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-[4px] px-3 py-2 text-[12px] shadow-lg">
      <p className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {entry.name}: <span className="font-semibold text-slate-900">
            {typeof entry.value === 'number' && entry.value % 1 !== 0
              ? entry.value.toFixed(1) + '%'
              : entry.value.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

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
      <div className="bg-white border border-slate-200 rounded-[6px] p-6 text-center text-slate-400">
        <p className="text-[14px] font-medium">No category data available</p>
        <p className="text-[12px] mt-1">Run a simulation to view category breakdown.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Utilization by Category */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-900">Machine Utilization by Category</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar
              dataKey="utilization_pct"
              name="Utilization"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Failures by Category */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-slate-400" />
          <h3 className="text-[14px] font-semibold text-slate-900">Total Failures by Category</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar
              dataKey="total_failures"
              name="Total Failures"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Summary Table */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-5">
        <h3 className="text-[14px] font-semibold text-slate-900 mb-4">Category Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[12px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3 border-y border-slate-200">Category</th>
                <th className="px-4 py-3 border-y border-slate-200 text-right">Utilization (%)</th>
                <th className="px-4 py-3 border-y border-slate-200 text-right">Total Failures</th>
                <th className="px-4 py-3 border-y border-slate-200 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chartData.map((metric) => (
                <tr key={metric.category} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {metric.category}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {metric.utilization_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {metric.total_failures.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-[4px] text-[12px] font-medium border ${
                        metric.utilization_pct >= 90
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : metric.utilization_pct >= 75
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
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
