import React, { useState } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';
import { FactoryFloorGrid, SingleQueueBar } from './components/floor_visualizer';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ManagerHistoryPanel from './components/analytics/ManagerHistoryPanel';
import AuthPage from './components/auth/AuthPage';
import { getToken, getStoredUser, logoutUser } from './api/authApi';
import { LogOut, User, Factory, Settings, BarChart3, Eye, ChevronLeft, Menu, ClipboardList } from 'lucide-react';

/**
 * FactoryServSim — Professional Dashboard with Sidebar Navigation
 */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [user, setUser] = useState(getStoredUser());
  const [currentConfig, setCurrentConfig] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [activePage, setActivePage] = useState('config');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        setSimulationResults(null);
      } else {
        setSimulationResults(historicalItem.results);
        setOptimizationResults(null);
      }
      setActivePage('analytics');
    }
  };

  // Single handler: receives BOTH results and auto-navigates to analytics
  const handleAnalysisComplete = (simResults, optResults) => {
    setSimulationResults(simResults);
    setOptimizationResults(optResults);
    setActivePage('analytics');
  };

  // Show auth page if not logged in
  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const hasResults = !!simulationResults || !!optimizationResults;

  const navItems = [
    { id: 'config', label: 'Setup', icon: Settings, always: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, always: false, needs: hasResults },
    { id: 'visualizer', label: 'Live Floor', icon: Eye, always: false, needs: !!simulationResults },
    { id: 'history', label: 'History', icon: ClipboardList, always: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ====== SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center h-16 border-b border-slate-800 px-4 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-2xl">🏭</span>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">FactoryServSim</h1>
                <p className="text-[10px] text-slate-500 truncate">Machine-Adjuster Simulator</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Factory Badge */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
              <Factory className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.factory_name || 'Factory'}</p>
                <p className="text-[10px] text-slate-500 font-mono">{user?.factory_id || ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const disabled = !item.always && !item.needs;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !disabled && setActivePage(item.id)}
                disabled={disabled}
                title={!sidebarOpen ? item.label : undefined}
                className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-sm shadow-indigo-500/10'
                    : disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                } ${sidebarOpen ? '' : 'justify-center'}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                {sidebarOpen && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarOpen && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: User + Logout */}
        <div className="border-t border-slate-800 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{user?.manager_name || 'Manager'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-full flex justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ====== MAIN CONTENT ====== */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="min-h-screen bg-slate-50">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activePage === 'config' && '⚙️ Setup Configuration'}
                  {activePage === 'analytics' && '📊 Analytics & Results'}
                  {activePage === 'visualizer' && '🏭 Live Factory Floor'}
                  {activePage === 'history' && '📋 Report History'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activePage === 'config' && 'Configure machines, adjusters, and run analysis'}
                  {activePage === 'analytics' && 'View simulation results and optimization insights'}
                  {activePage === 'visualizer' && 'Real-time factory floor state visualization'}
                  {activePage === 'history' && 'Browse and reload past simulation & optimization runs'}
                </p>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* CONFIG PAGE */}
            <div className={`transition-all duration-300 ${activePage === 'config' ? 'opacity-100' : 'hidden opacity-0'}`}>
              <ConfiguratorSection
                onAnalysisComplete={handleAnalysisComplete}
                onConfigChange={setCurrentConfig}
              />
            </div>

            {/* ANALYTICS PAGE */}
            <div className={`transition-all duration-300 ${activePage === 'analytics' ? 'opacity-100' : 'hidden opacity-0'}`}>
              <div className="space-y-6">
                <AnalyticsDashboard
                  simulationResults={simulationResults}
                  optimizationResults={optimizationResults}
                />

                {/* Visualizer Prompt at the bottom of Analytics */}
                {simulationResults && (
                  <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          🏭 Want to see the Live Factory Floor?
                        </h3>
                        <p className="text-sm text-indigo-100 mt-1">
                          Visualize how your machines and adjusters interact in real-time based on the simulation results.
                        </p>
                      </div>
                      <button
                        onClick={() => setActivePage('visualizer')}
                        className="flex-shrink-0 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        Open Live Floor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VISUALIZER PAGE */}
            <div className={`transition-all duration-300 ${activePage === 'visualizer' ? 'opacity-100' : 'hidden opacity-0'}`}>
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900">
                    🏭 Live Factory Floor & Single-Queue State
                  </h2>
                  <button 
                    onClick={() => setActivePage('analytics')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    ← Back to Analytics
                  </button>
                </div>
                <SingleQueueBar
                  machineQueueCount={simulationResults ? (simulationResults.summary?.overall_machine_utilization_pct < 95 ? Math.floor((100 - simulationResults.summary.overall_machine_utilization_pct)/5) + 1 : 0) : 0}
                  idleAdjusterCount={simulationResults ? (simulationResults.summary?.overall_machine_utilization_pct >= 95 ? Math.floor(100 - simulationResults.summary.overall_adjuster_utilization_pct)/10 + 1 : 0) : 0}
                />
                <FactoryFloorGrid machines={simulationResults?.machines || (simulationResults?.category_metrics ? simulationResults.category_metrics.flatMap((cat, i) => Array.from({ length: Math.min(12, Math.max(3, Math.floor(cat.total_failures / 100))) }).map((_, j) => { const r = Math.random(); return {id: `${i}-${j}`, name: `${cat.category} Unit ${j+1}`, category: cat.category, state: r > 0.9 ? 'UNDER_REPAIR' : (r > 0.7 ? 'WAITING_FOR_REPAIR' : 'RUNNING')} })) : [])} />
              </section>
            </div>

            {/* HISTORY PAGE */}
            <div className={`transition-all duration-300 ${activePage === 'history' ? 'opacity-100' : 'hidden opacity-0'}`}>
              <ManagerHistoryPanel
                currentConfig={currentConfig}
                simulationResults={simulationResults}
                optimizationResults={optimizationResults}
                onLoadHistoricalRun={handleLoadHistoricalRun}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
