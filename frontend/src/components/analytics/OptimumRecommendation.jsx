import React, { useMemo } from 'react';
import { Target, Lightbulb, Activity, CheckCircle, TrendingUp, List } from 'lucide-react';
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
 *
 * Displays the recommended optimum number of adjusters with:
 *   1. A prominent recommendation card with the optimum count
 *   2. A visual area chart highlighting the tradeoff zone
 *   3. The recommendation reasoning text from the optimizer
 *
 * Data source: OptimizationResultOutput from Person 2/3's optimizer API.
 *
 * Props:
 *   - optimizationResults: {
 *       optimum_adjuster_count: number,
 *       tradeoff_curve: Array<{ adjuster_count, machine_utilization, adjuster_utilization }>,
 *       recommendation_reason: string
 *     }
 */

/**
 * Compute the "efficiency score" for each point on the tradeoff curve.
 * A simple balanced metric: geometric mean of machine and adjuster utilization.
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

/**
 * Custom dot component to highlight the optimum point.
 */
function OptimumDot(props) {
  const { cx, cy, payload } = props;
  if (payload.is_optimum) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#d97706" fillOpacity={0.3} />
        <circle cx={cx} cy={cy} r={5} fill="#d97706" stroke="#fff" strokeWidth={2} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="#1e3a5f" stroke="#fff" strokeWidth={1.5} />;
}

function RecommendationTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-1 flex items-center gap-2">
        {data.adjuster_count} Adjuster{data.adjuster_count !== 1 ? 's' : ''}
        {data.is_optimum && (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm">
            <CheckCircle size={10} /> Optimum
          </span>
        )}
      </p>
      <div className="space-y-1 mt-2 font-medium">
        <p className="text-emerald-700">Machine Util: {data.machine_utilization}%</p>
        <p className="text-indigo-700">Adjuster Util: {data.adjuster_utilization}%</p>
        <p className="text-slate-600">Efficiency Score: {data.efficiency_score}%</p>
      </div>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center text-slate-500">
        <Target size={48} className="text-slate-300 mb-4" />
        <p className="text-lg font-medium text-slate-700">Staffing Recommendation</p>
        <p className="text-sm mt-2">
          Run an optimization to receive the recommended number of adjusters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendation Hero Card */}
      <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 p-8 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 text-slate-800 opacity-50">
          <Target size={240} strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Optimum Count */}
          <div className="text-left">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <CheckCircle size={18} />
              <p className="text-sm font-semibold uppercase tracking-wider">
                Recommended Optimum
              </p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-bold text-white tracking-tight">
                {optimumCount ?? '—'}
              </span>
              <span className="text-2xl text-slate-400 font-medium">
                Adjuster{optimumCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Key Metrics at Optimum */}
          {optimumPoint && (
            <div className="flex flex-wrap gap-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Machine Uptime</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {optimumPoint.machine_utilization}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Adjuster Busy</p>
                <p className="text-2xl font-bold text-indigo-400">
                  {optimumPoint.adjuster_utilization}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Efficiency Score</p>
                <p className="text-2xl font-bold text-amber-400">
                  {optimumPoint.efficiency_score}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation Reason */}
        {reason && (
          <div className="relative z-10 mt-6 bg-slate-800/80 rounded-lg p-5 border border-slate-700 flex gap-4 items-start">
            <Lightbulb className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <span className="font-semibold text-slate-200 block mb-1 text-sm uppercase tracking-wider">Engineering Insight</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                {reason}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Per-Category Adjuster Staffing Report */}
      {optimizationResults?.per_category_adjusters && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            📋 Recommended Adjusters Per Category
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Breakdown of how many adjusters are needed for each machine category based on failure rates and machine counts.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(optimizationResults.per_category_adjusters).map(
              ([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                      {category}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {count}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        adjuster{count !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg">
                    {count}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <span className="text-emerald-600 font-semibold text-sm">
              Total Recommended: {optimumCount} adjuster{optimumCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Per-Adjuster Staffing Breakdown */}
      {optimizationResults?.per_adjuster_counts && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            👷 Required Adjusters by Profile
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Exact quantity of each adjuster role required to achieve the optimal total of {optimumCount} adjusters.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(optimizationResults.per_adjuster_counts).map(
              ([adjusterName, count]) => (
                <div
                  key={adjusterName}
                  className="flex items-center justify-between rounded-xl border-2 border-indigo-100 bg-indigo-50/50 p-4 shadow-sm"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                      Role Profile
                    </span>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {adjusterName}
                    </p>
                    <p className="text-sm text-slate-600">
                      Hire / Assign:{' '}
                      <span className="font-semibold text-indigo-700">
                        {count} required
                      </span>
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-xl shadow-md">
                    {count}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <span className="text-xs text-indigo-800 font-medium">
              💡 Staffing Recipe: {Object.entries(optimizationResults.per_adjuster_counts).map(([name, count]) => `${count}x ${name}`).join(' + ')}
            </span>
            <span className="text-indigo-900 font-bold text-sm">
              Total: {optimumCount}
            </span>
          </div>
        </div>
      )}

      {/* Efficiency Tradeoff Area Chart */}
      {efficiencyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-slate-800" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">
              Staffing Efficiency Tradeoff
            </h3>
          </div>
          <p className="text-sm text-slate-500 mb-6 pb-4 border-b border-gray-100">
            The efficiency score balances machine uptime against adjuster utilization.
            The optimum point maximizes this combined efficiency metric.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={efficiencyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="adjuster_count"
                label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10, fill: '#64748b' }}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Efficiency Score (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<RecommendationTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {optimumCount && (
                <ReferenceLine
                  x={optimumCount}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'OPTIMUM',
                    position: 'top',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="efficiency_score"
                stroke="#1e3a5f"
                fill="url(#efficiencyGradient)"
                strokeWidth={3}
                dot={<OptimumDot />}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tradeoff Data Table */}
      {efficiencyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <List className="text-slate-800" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">
              Staffing Options Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Adjusters</th>
                  <th className="px-6 py-4 text-right">Machine Util.</th>
                  <th className="px-6 py-4 text-right">Adjuster Util.</th>
                  <th className="px-6 py-4 text-right">Efficiency Score</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {efficiencyData.map((row) => (
                  <tr
                    key={row.adjuster_count}
                    className={`transition-colors ${
                      row.is_optimum ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {row.adjuster_count}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-700 font-medium">
                      {row.machine_utilization}%
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-indigo-700 font-medium">
                      {row.adjuster_utilization}%
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-700 font-medium">
                      {row.efficiency_score}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_optimum ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2.5 py-1 rounded-sm border border-amber-200">
                          <CheckCircle size={10} /> OPTIMUM
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
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
