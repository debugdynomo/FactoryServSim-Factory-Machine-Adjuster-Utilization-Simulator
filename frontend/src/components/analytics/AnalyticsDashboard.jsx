import React, { useState, useMemo, useCallback } from 'react';
import { BarChart3, Factory, Wrench, Clock, AlertTriangle, LayoutDashboard, List, Target, RefreshCw, X } from 'lucide-react';
import UtilizationCharts from './UtilizationCharts';
import CategoryBreakdown from './CategoryBreakdown';
import OptimumRecommendation from './OptimumRecommendation';
import ExportPanel from './ExportPanel';
import {
  getMockSimulationResults,
  getMockOptimizationResults,
} from '../../api/simulationApi';

/**
 * AnalyticsDashboard — Person 6, Analytics Module (Main Container)
 *
 * Orchestrates all analytics components:
 *   1. KPI Metric Cards — top-level summary metrics
 *   2. UtilizationCharts — line charts for utilization vs adjusters
 *   3. CategoryBreakdown — bar charts for per-category comparison
 *   4. OptimumRecommendation — staffing optimization display
 *   5. ExportPanel — CSV/JSON/Print export
 *
 * This component receives simulation and optimization results as props from
 * the parent App (which gets them from Person 4's configurator triggering
 * Person 3's backend API). It also provides a "Load Demo Data" button for
 * independent development and testing.
 *
 * Props:
 *   - simulationResults: SimulationResultOutput | null
 *   - optimizationResults: OptimizationResultOutput | null
 */

/**
 * KPICard — Displays a single key performance indicator metric.
 */
function KPICard({ label, value, unit, icon: Icon, color, subtitle }) {
  const colorClasses = {
    emerald: 'border-emerald-600 text-emerald-700',
    indigo: 'border-indigo-600 text-indigo-700',
    amber: 'border-amber-500 text-amber-600',
    rose: 'border-rose-600 text-rose-700',
  };

  const bgClasses = {
    emerald: 'bg-emerald-50',
    indigo: 'bg-indigo-50',
    amber: 'bg-amber-50',
    rose: 'bg-rose-50',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${colorClasses[color] || colorClasses.emerald} border-t border-r border-b border-gray-200 p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${bgClasses[color] || bgClasses.emerald}`}>
            <Icon size={20} className={colorClasses[color] || colorClasses.emerald} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}

/**
 * Extract KPI values from simulation results.
 */
function useKPIMetrics(simulationResults) {
  return useMemo(() => {
    if (!simulationResults?.summary) {
      return {
        machineUtil: null,
        adjusterUtil: null,
        avgWaitTime: null,
        totalFailures: null,
      };
    }

    const s = simulationResults.summary;
    return {
      machineUtil: s.overall_machine_utilization_pct,
      adjusterUtil: s.overall_adjuster_utilization_pct,
      avgWaitTime: s.avg_queue_wait_time,
      totalFailures: s.total_failures_handled,
    };
  }, [simulationResults]);
}

/**
 * Format a number for display, handling null/undefined gracefully.
 */
function formatMetric(value, decimals = 1) {
  if (value === null || value === undefined) return '—';
  return typeof value === 'number' ? value.toFixed(decimals) : String(value);
}

function formatCount(value) {
  if (value === null || value === undefined) return '—';
  return typeof value === 'number' ? value.toLocaleString() : String(value);
}

export default function AnalyticsDashboard({
  simulationResults: propSimResults = null,
  optimizationResults: propOptResults = null,
}) {
  // Local state for demo data loading (allows independent development)
  const [demoSimResults, setDemoSimResults] = useState(null);
  const [demoOptResults, setDemoOptResults] = useState(null);

  // Use prop data if available, otherwise fall back to demo data
  const simulationResults = propSimResults || demoSimResults;
  const optimizationResults = propOptResults || demoOptResults;

  const kpi = useKPIMetrics(simulationResults);

  // Active tab for chart sections
  const [activeTab, setActiveTab] = useState('overview');

  const handleLoadDemoData = useCallback(() => {
    setDemoSimResults(getMockSimulationResults());
    setDemoOptResults(getMockOptimizationResults());
  }, []);

  const handleClearData = useCallback(() => {
    setDemoSimResults(null);
    setDemoOptResults(null);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'categories', label: 'Categories', icon: List },
    { id: 'optimization', label: 'Optimization', icon: Target },
  ];

  return (
    <section className="space-y-6" aria-label="Analytics Dashboard">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-lg text-white">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
            <p className="text-sm text-slate-500">
              Simulation metrics, utilization charts, and staffing recommendations
            </p>
          </div>
        </div>

        {/* Demo Data Controls (for independent development/testing) */}
        {!propSimResults && !propOptResults && (
          <div className="flex gap-2">
            <button
              onClick={handleLoadDemoData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw size={16} /> Load Demo Data
            </button>
            {(demoSimResults || demoOptResults) && (
              <button
                onClick={handleClearData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <X size={16} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Machine Utilization"
          value={formatMetric(kpi.machineUtil)}
          unit="%"
          icon={Factory}
          color="emerald"
          subtitle="Overall machine uptime percentage"
        />
        <KPICard
          label="Adjuster Utilization"
          value={formatMetric(kpi.adjusterUtil)}
          unit="%"
          icon={Wrench}
          color="indigo"
          subtitle="Overall adjuster busy time"
        />
        <KPICard
          label="Avg Wait Time"
          value={formatMetric(kpi.avgWaitTime, 2)}
          unit="units"
          icon={Clock}
          color="amber"
          subtitle="Average queue wait time"
        />
        <KPICard
          label="Failures Handled"
          value={formatCount(kpi.totalFailures)}
          unit=""
          icon={AlertTriangle}
          color="rose"
          subtitle="Total repairs completed"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white px-2 pt-2 rounded-t-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-gray-500 hover:text-slate-700 hover:border-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <UtilizationCharts
            tradeoffCurve={optimizationResults?.tradeoff_curve}
            optimumCount={optimizationResults?.optimum_adjuster_count}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryBreakdown categoryMetrics={simulationResults?.category_metrics} />
        )}

        {activeTab === 'optimization' && (
          <OptimumRecommendation optimizationResults={optimizationResults} />
        )}
      </div>

      {/* Export Panel — always visible */}
      <ExportPanel
        simulationResults={simulationResults}
        optimizationResults={optimizationResults}
      />
    </section>
  );
}
