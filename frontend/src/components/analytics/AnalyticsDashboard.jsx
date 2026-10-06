import React, { useState, useMemo, useCallback } from 'react';
import { Factory, Wrench, Clock, AlertTriangle, LayoutDashboard, List, Target, RefreshCw, X } from 'lucide-react';
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
 */

function KPICard({ label, value, unit, icon: Icon, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[6px] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] uppercase text-slate-500 font-semibold tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-[28px] font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {unit && <span className="text-[14px] text-slate-500">{unit}</span>}
      </div>
      {subtitle && <p className="text-[12px] text-slate-400 mt-3 pt-3 border-t border-slate-100">{subtitle}</p>}
    </div>
  );
}

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
  const [demoSimResults, setDemoSimResults] = useState(null);
  const [demoOptResults, setDemoOptResults] = useState(null);

  const simulationResults = propSimResults || demoSimResults;
  const optimizationResults = propOptResults || demoOptResults;

  const kpi = useKPIMetrics(simulationResults);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Analytics Dashboard</h2>
          <p className="text-[14px] text-slate-500 mt-1">
            Simulation metrics, utilization charts, and staffing recommendations
          </p>
        </div>

        {/* Demo Data Controls */}
        {!propSimResults && !propOptResults && (
          <div className="flex gap-2">
            <button
              onClick={handleLoadDemoData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium rounded-[6px] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Load Demo Data
            </button>
            {(demoSimResults || demoOptResults) && (
              <button
                onClick={handleClearData}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[14px] font-medium rounded-[6px] transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
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
          subtitle="Overall machine uptime percentage"
        />
        <KPICard
          label="Adjuster Utilization"
          value={formatMetric(kpi.adjusterUtil)}
          unit="%"
          icon={Wrench}
          subtitle="Overall adjuster busy time"
        />
        <KPICard
          label="Avg Wait Time"
          value={formatMetric(kpi.avgWaitTime, 2)}
          unit="units"
          icon={Clock}
          subtitle="Average queue wait time"
        />
        <KPICard
          label="Failures Handled"
          value={formatCount(kpi.totalFailures)}
          unit=""
          icon={AlertTriangle}
          subtitle="Total repairs completed"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
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

      {/* Export Panel */}
      <ExportPanel
        simulationResults={simulationResults}
        optimizationResults={optimizationResults}
      />
    </section>
  );
}
