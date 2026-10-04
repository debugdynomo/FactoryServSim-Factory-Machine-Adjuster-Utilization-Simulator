import React, { useState } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';
import { FactoryFloorGrid, SingleQueueBar } from './components/floor_visualizer';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ManagerHistoryPanel from './components/analytics/ManagerHistoryPanel';
import AuthPage from './components/auth/AuthPage';
import { getToken, getStoredUser, logoutUser } from './api/authApi';
import { LogOut, User } from 'lucide-react';

/**
 * FactoryServSim — Unified Full-Stack Application Shell
 * 
 * Integrates:
 *   - Authentication: Login / Register with JWT
 *   - MongoDB Database: Factory & Simulation Reports History
 *   - Person 4: Factory Configurator (CategoryForm, AdjusterForm, PresetSelector)
 *   - Person 5: Live Factory Floor & Single-Queue Visualizer (Grid, QueueBar, Controls)
 *   - Person 6: Analytics Dashboard (KPIs, Charts, Recommendations, ExportPanel)
 */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [user, setUser] = useState(getStoredUser());
  const [currentConfig, setCurrentConfig] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setUser(getStoredUser());
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setUser(null);
    setSimulationResults(null);
    setOptimizationResults(null);
    setCurrentConfig(null);
  };

  // Allow loading a historical run from the MongoDB history back onto dashboard
  const handleLoadHistoricalRun = (historicalItem) => {
    if (historicalItem.results) {
      if (historicalItem.report_type === 'optimization') {
        setOptimizationResults(historicalItem.results.optimization || historicalItem.results);
      } else {
        setSimulationResults(historicalItem.results);
      }
    }
  };

  // Show auth page if not logged in
  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-950 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🏭 FactoryServSim
            </h1>
            <p className="text-xs text-slate-400">
              Machine-Adjuster Utilization Simulator & MongoDB Report Manager
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <User className="w-4 h-4 text-indigo-400" />
              <span>{user?.manager_name || user?.email || 'Manager'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Person 4: Factory Configurator */}
        <ConfiguratorSection
          onSimulationComplete={setSimulationResults}
          onOptimizationComplete={setOptimizationResults}
          onConfigChange={setCurrentConfig}
        />

        {/* Manager History & Save Report Panel (MongoDB) */}
        <ManagerHistoryPanel
          currentConfig={currentConfig}
          simulationResults={simulationResults}
          optimizationResults={optimizationResults}
          onLoadHistoricalRun={handleLoadHistoricalRun}
        />

        {/* Person 5: Interactive Factory Floor & Single-Queue Visualizer */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            🏭 Live Factory Floor & Single-Queue State
          </h2>
          <SingleQueueBar
            machineQueueCount={simulationResults ? (simulationResults.summary?.overall_machine_utilization_pct < 95 ? Math.floor((100 - simulationResults.summary.overall_machine_utilization_pct)/5) + 1 : 0) : 0}
            idleAdjusterCount={simulationResults ? (simulationResults.summary?.overall_machine_utilization_pct >= 95 ? Math.floor(100 - simulationResults.summary.overall_adjuster_utilization_pct)/10 + 1 : 0) : 0}
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
