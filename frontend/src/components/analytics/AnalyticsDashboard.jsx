import React, { useState, useMemo, useCallback } from 'react';
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
function KPICard({ label, value, unit, icon, color, subtitle }) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
    amber: 'from-amber-500 to-amber-600 shadow-amber-200',
    rose: 'from-rose-500 to-rose-600 shadow-rose-200',
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        colorClasses[color] || colorClasses.emerald
      } rounded-xl shadow-lg p-5 text-white`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-80">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
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
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'categories', label: '📋 Categories', icon: '📋' },
    { id: 'optimization', label: '🎯 Optimization', icon: '🎯' },
  ];

  return (
    <section className="space-y-6" aria-label="Analytics Dashboard">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📊 Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">
            Simulation metrics, utilization charts, and staffing recommendations
          </p>
        </div>

        {/* Demo Data Controls (for independent development/testing) */}
        {!propSimResults && !propOptResults && (
          <div className="flex gap-2">
            <button
              onClick={handleLoadDemoData}
              className="px-4 py-2 bg-factory-accent hover:bg-factory-dark text-white text-sm rounded-lg transition-colors shadow-sm"
            >
              🔄 Load Demo Data
            </button>
            {(demoSimResults || demoOptResults) && (
              <button
                onClick={handleClearData}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors"
              >
                ✕ Clear
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
          icon="🏭"
          color="emerald"
          subtitle="Overall machine uptime percentage"
        />
        <KPICard
          label="Adjuster Utilization"
          value={formatMetric(kpi.adjusterUtil)}
          unit="%"
          icon="🔧"
          color="indigo"
          subtitle="Overall adjuster busy time"
        />
        <KPICard
          label="Avg Wait Time"
          value={formatMetric(kpi.avgWaitTime, 2)}
          unit="units"
          icon="⏱️"
          color="amber"
          subtitle="Average queue wait time"
        />
        <KPICard
          label="Failures Handled"
          value={formatCount(kpi.totalFailures)}
          unit=""
          icon="🔩"
          color="rose"
          subtitle="Total repairs completed"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-factory-highlight text-factory-highlight'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
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
