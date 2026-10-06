import React, { useMemo } from 'react';
import { Target, Info, CheckCircle2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

/**
 * OptimumRecommendation — Person 6, Analytics Module
 */

function useEfficiencyData(tradeoffCurve, optimumCount) {
  return useMemo(() => {
    if (!tradeoffCurve || tradeoffCurve.length === 0) return [];
    return [...tradeoffCurve]
      .sort((a, b) => a.adjuster_count - b.adjuster_count)
      .map((point) => ({
        ...point,
        efficiency_score: Math.sqrt(
          point.machine_utilization * point.adjuster_utilization
        ).toFixed(1),
        is_optimum: point.adjuster_count === optimumCount,
      }));
  }, [tradeoffCurve, optimumCount]);
}

function OptimumDot(props) {
  const { cx, cy, payload } = props;
  if (payload.is_optimum) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#2563eb" fillOpacity={0.2} />
        <circle cx={cx} cy={cy} r={4} fill="#2563eb" stroke="#fff" strokeWidth={1} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={0} />;
}

function RecommendationTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-[4px] px-3 py-2 text-[12px] shadow-lg">
      <p className="font-semibold text-slate-900 mb-1 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
        <span>{data.adjuster_count} Adjusters</span>
        {data.is_optimum && (
          <span className="text-[10px] uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-[4px] border border-blue-200">
            Optimum
          </span>
        )}
      </p>
      <p className="text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
        Machine Util: <span className="font-semibold text-slate-900">{data.machine_utilization}%</span>
      </p>
      <p className="text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
        Adjuster Util: <span className="font-semibold text-slate-900">{data.adjuster_utilization}%</span>
      </p>
      <p className="text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
        Efficiency: <span className="font-semibold text-slate-900">{data.efficiency_score}%</span>
      </p>
    </div>
  );
}

export default function OptimumRecommendation({ optimizationResults }) {
  const {
    optimum_adjuster_count: optimumCount = null,
    tradeoff_curve: tradeoffCurve = [],
    recommendation_reason: reason = '',
  } = optimizationResults || {};

  const efficiencyData = useEfficiencyData(tradeoffCurve, optimumCount);

  // Find optimum point data
  const optimumPoint = useMemo(() => {
    return efficiencyData.find((d) => d.is_optimum) || null;
  }, [efficiencyData]);

  if (!optimizationResults) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-400">
        <p className="text-lg">🎯 Staffing Recommendation</p>
        <p className="text-sm mt-2">
          Run an optimization to receive the recommended number of adjusters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendation Hero Card */}
      <div className="bg-white border border-slate-200 rounded-[6px] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Optimum Count */}
        <div className="text-center md:text-left flex flex-col">
          <p className="text-[12px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-2 justify-center md:justify-start">
            <Target className="w-4 h-4 text-slate-400" />
            Recommended Staffing
          </p>
          <div className="flex items-baseline gap-2 justify-center md:justify-start">
            <span className="text-[36px] font-semibold text-slate-900 leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {optimumCount ?? '—'}
            </span>
            <span className="text-[14px] text-slate-500">
              Adjuster{optimumCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Key Metrics at Optimum */}
        {optimumPoint && (
          <div className="flex gap-8">
            <div className="text-center md:text-left">
              <p className="text-[12px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Machine Uptime</p>
              <p className="text-[20px] font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {optimumPoint.machine_utilization}%
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-[12px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Adjuster Busy</p>
              <p className="text-[20px] font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {optimumPoint.adjuster_utilization}%
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-[12px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Efficiency Score</p>
              <p className="text-[20px] font-semibold text-blue-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {optimumPoint.efficiency_score}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation Reason */}
      {reason && (
        <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-4 flex gap-3 items-start">
          <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900 mr-1">Insight:</span>
            {reason}
          </p>
        </div>
      )}

      {/* Per-Category Adjuster Staffing Report */}
      {optimizationResults?.per_category_adjusters && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            Recommended Adjusters Per Category
          </h3>
          <p className="text-[12px] text-slate-500 mb-4">
            Breakdown of how many adjusters are needed for each machine category.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(optimizationResults.per_category_adjusters).map(
              ([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-[4px] bg-slate-50"
                >
                  <span className="font-medium text-[13px] text-slate-700">{category}</span>
                  <span className="font-semibold text-[14px] text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                </div>
              )
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[12px] text-slate-600">
              Total Recommended: <span className="font-semibold text-slate-900">{optimumCount}</span> adjuster{optimumCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Per-Adjuster Staffing Breakdown */}
      {optimizationResults?.per_adjuster_counts && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-1">
            Required Adjusters by Profile
          </h3>
          <p className="text-[12px] text-slate-500 mb-4">
            Exact quantity of each adjuster role required to achieve the optimal total.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(optimizationResults.per_adjuster_counts).map(
              ([adjusterName, count]) => (
                <div
                  key={adjusterName}
                  className="flex items-center justify-between rounded-[4px] border border-blue-200 bg-blue-50/50 p-4"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-[4px]">
                      Role Profile
                    </span>
                    <p className="mt-1 text-[14px] font-semibold text-slate-900">
                      {adjusterName}
                    </p>
                    <p className="text-[12px] text-slate-600 mt-0.5">
                      Hire / Assign:{' '}
                      <span className="font-semibold text-blue-700">
                        {count} required
                      </span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-blue-600 text-white font-bold text-[16px]">
                    {count}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-[4px] bg-slate-50 border border-slate-200 p-3">
            <span className="text-[12px] text-slate-600 font-medium">
              Recipe: {Object.entries(optimizationResults.per_adjuster_counts).map(([name, count]) => `${count}x ${name}`).join(' + ')}
            </span>
            <span className="text-slate-900 font-semibold text-[13px]">
              Total: {optimumCount}
            </span>
          </div>
        </div>
      )}

      {/* Efficiency Curve Chart */}
      {efficiencyData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            Efficiency Curve & Tradeoff
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={efficiencyData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
              />
              <Tooltip content={<RecommendationTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {optimumCount && (
                <ReferenceLine
                  x={optimumCount}
                  stroke="#2563eb"
                  strokeWidth={1}
                  label={{
                    value: 'Optimum',
                    position: 'top',
                    fill: '#2563eb',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="efficiency_score"
                stroke="#2563eb"
                fill="url(#efficiencyGradient)"
                strokeWidth={2}
                dot={<OptimumDot />}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tradeoff Data Table */}
      {efficiencyData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">
            Staffing Options Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[12px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-y border-slate-200">Adjusters</th>
                  <th className="px-4 py-3 border-y border-slate-200 text-right">Machine Util.</th>
                  <th className="px-4 py-3 border-y border-slate-200 text-right">Adjuster Util.</th>
                  <th className="px-4 py-3 border-y border-slate-200 text-right">Efficiency</th>
                  <th className="px-4 py-3 border-y border-slate-200 text-center">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {efficiencyData.map((row) => (
                  <tr
                    key={row.adjuster_count}
                    className={`hover:bg-slate-50 transition-colors ${
                      row.is_optimum ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.adjuster_count}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.machine_utilization}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.adjuster_utilization}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.efficiency_score}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.is_optimum && (
                        <span className="text-[10px] uppercase tracking-wider text-blue-700 bg-blue-100 border border-blue-200 font-semibold px-2 py-0.5 rounded-[4px]">
                          Optimum
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
