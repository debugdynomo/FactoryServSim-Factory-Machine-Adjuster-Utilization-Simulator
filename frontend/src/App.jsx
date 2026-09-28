import React, { useState } from 'react';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

/**
 * FactoryServSim — Main Application Shell
 * 
 * Layout:
 *   - Configurator (Person 4: frontend/src/components/configurator/)
 *   - Floor Visualizer (Person 5: frontend/src/components/floor_visualizer/)
 *   - Analytics Dashboard (Person 6: frontend/src/components/analytics/)
 */
export default function App() {
  // Shared simulation results state — will be populated by Person 4's configurator
  // triggering the backend API via Person 3's endpoints
  const [simulationResults, setSimulationResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-factory-dark text-white py-4 px-6 shadow-lg">
        <h1 className="text-2xl font-bold">🏭 FactoryServSim</h1>
        <p className="text-gray-300 text-sm">Factory Machine-Adjuster Utilization Simulator</p>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Person 4: Configurator Section */}
        {/* <ConfiguratorSection onSimulationComplete={setSimulationResults} onOptimizationComplete={setOptimizationResults} /> */}

        {/* Person 5: Factory Floor Visualizer */}
        {/* <FloorVisualizerSection simulationData={simulationResults} /> */}

        {/* Person 6: Analytics Dashboard */}
        <AnalyticsDashboard
          simulationResults={simulationResults}
          optimizationResults={optimizationResults}
        />
      </main>
    </div>
  );
}
