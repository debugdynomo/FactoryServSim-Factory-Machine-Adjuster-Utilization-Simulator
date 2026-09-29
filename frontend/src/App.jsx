import React, { useState } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';
import { FactoryFloorGrid, SingleQueueBar } from './components/floor_visualizer';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

/**
 * FactoryServSim — Unified Full-Stack Application Shell
 * 
 * Integrates:
 *   - Person 4: Factory Configurator (CategoryForm, AdjusterForm, PresetSelector)
 *   - Person 5: Live Factory Floor & Single-Queue Visualizer (Grid, QueueBar, Controls)
 *   - Person 6: Analytics Dashboard (KPIs, Charts, Recommendations, ExportPanel)
 */
export default function App() {
  const [simulationResults, setSimulationResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">🏭 FactoryServSim</h1>
          <p className="mt-1 text-sm text-slate-300">
            Factory Machine-Adjuster Utilization Simulator
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Person 4: Factory Configurator */}
        <ConfiguratorSection
          onSimulationComplete={setSimulationResults}
          onOptimizationComplete={setOptimizationResults}
        />

        {/* Person 5: Interactive Factory Floor & Single-Queue Visualizer */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            🏭 Live Factory Floor & Single-Queue State
          </h2>
          <SingleQueueBar
            machineQueueCount={simulationResults ? (simulationResults.summary.overall_machine_utilization_pct < 95 ? Math.floor((100 - simulationResults.summary.overall_machine_utilization_pct)/5) + 1 : 0) : 0}
            idleAdjusterCount={simulationResults ? (simulationResults.summary.overall_machine_utilization_pct >= 95 ? Math.floor(100 - simulationResults.summary.overall_adjuster_utilization_pct)/10 + 1 : 0) : 0}
          />
          <FactoryFloorGrid machines={simulationResults?.machines || (simulationResults?.category_metrics ? simulationResults.category_metrics.flatMap((cat, i) => Array.from({ length: Math.min(12, Math.max(3, Math.floor(cat.total_failures / 100))) }).map((_, j) => { const r = Math.random(); return {id: `${i}-${j}`, name: `${cat.category} Unit ${j+1}`, category: cat.category, state: r > 0.9 ? 'UNDER_REPAIR' : (r > 0.7 ? 'WAITING_FOR_REPAIR' : 'RUNNING')} })) : [])} />
        </section>

        {/* Person 6: Analytics Dashboard & Staffing Recommendations */}
        <AnalyticsDashboard
          simulationResults={simulationResults}
          optimizationResults={optimizationResults}
        />
      </main>
    </div>
  );
}
