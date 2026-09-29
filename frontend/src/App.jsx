import React, { useState } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';

/**
 * FactoryServSim — Main Application Shell
 * 
 * Layout:
 *   - Configurator (Person 4: frontend/src/components/configurator/)
 *   - Floor Visualizer (Person 5: frontend/src/components/floor_visualizer/)
 *   - Analytics Dashboard (Person 6: frontend/src/components/analytics/)
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Person 4: Factory Configurator */}
        <ConfiguratorSection
          onSimulationComplete={setSimulationResults}
          onOptimizationComplete={setOptimizationResults}
        />

        {(simulationResults || optimizationResults) && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Latest Results
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Simulation and optimization results are now available to the
              analytics and floor-visualizer modules.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
