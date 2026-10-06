import React, { useMemo } from 'react';
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
        <circle cx={cx} cy={cy} r={8} fill="#e94560" fillOpacity={0.3} />
        <circle cx={cx} cy={cy} r={5} fill="#e94560" stroke="#fff" strokeWidth={2} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill="#6366f1" />;
}

function RecommendationTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">
        {data.adjuster_count} Adjuster{data.adjuster_count !== 1 ? 's' : ''}
        {data.is_optimum && (
          <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            ★ Optimum
          </span>
        )}
      </p>
      <p className="text-emerald-600">Machine Util: {data.machine_utilization}%</p>
      <p className="text-indigo-600">Adjuster Util: {data.adjuster_utilization}%</p>
      <p className="text-gray-500">Efficiency: {data.efficiency_score}%</p>
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
      <div className="bg-gradient-to-r from-factory-dark to-factory-accent rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Optimum Count */}
          <div className="text-center md:text-left">
            <p className="text-sm uppercase tracking-wider text-gray-300 mb-1">
              Recommended Optimum
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold text-factory-highlight">
                {optimumCount ?? '—'}
              </span>
              <span className="text-xl text-gray-300">
                Adjuster{optimumCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Key Metrics at Optimum */}
          {optimumPoint && (
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-400">Machine Uptime</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {optimumPoint.machine_utilization}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-400">Adjuster Busy</p>
                <p className="text-2xl font-bold text-indigo-400">
                  {optimumPoint.adjuster_utilization}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-400">Efficiency</p>
                <p className="text-2xl font-bold text-amber-400">
                  {optimumPoint.efficiency_score}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation Reason */}
        {reason && (
          <div className="mt-4 bg-white/10 rounded-lg p-4">
            <p className="text-sm text-gray-200">
              <span className="font-semibold text-white">💡 Insight: </span>
              {reason}
            </p>
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
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🎯 Staffing Efficiency Tradeoff
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            The efficiency score balances machine uptime against adjuster utilization.
            The optimum point maximizes the combined efficiency.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={efficiencyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="adjuster_count"
                label={{ value: 'Number of Adjusters', position: 'insideBottomRight', offset: -10 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<RecommendationTooltip />} />
              {optimumCount && (
                <ReferenceLine
                  x={optimumCount}
                  stroke="#e94560"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
              <Area
                type="monotone"
                dataKey="efficiency_score"
                stroke="#6366f1"
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
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📋 Staffing Options Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Adjusters</th>
                  <th className="px-4 py-3 text-right">Machine Util.</th>
                  <th className="px-4 py-3 text-right">Adjuster Util.</th>
                  <th className="px-4 py-3 text-right">Efficiency</th>
                  <th className="px-4 py-3 text-center">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {efficiencyData.map((row) => (
                  <tr
                    key={row.adjuster_count}
                    className={`hover:bg-gray-50 ${
                      row.is_optimum ? 'bg-red-50 font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono">{row.adjuster_count}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {row.machine_utilization}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-600">
                      {row.adjuster_utilization}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.efficiency_score}%</td>
                    <td className="px-4 py-3 text-center">
                      {row.is_optimum && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                          ★ OPTIMUM
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
