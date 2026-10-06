import React, { useState, useRef, useEffect } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';
import { FactoryFloorGrid, SingleQueueBar } from './components/floor_visualizer';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ManagerHistoryPanel from './components/analytics/ManagerHistoryPanel';
import AuthPage from './components/auth/AuthPage';
import { getToken, getStoredUser, logoutUser } from './api/authApi';
import { LogOut, User, Factory, Settings, BarChart3, Eye, ChevronLeft, Menu, ClipboardList, Sliders, LayoutDashboard, Activity, History, Cpu } from 'lucide-react';

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

  const [liveSimRunning, setLiveSimRunning] = useState(false);
  const [liveMachines, setLiveMachines] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const [liveTotalTime, setLiveTotalTime] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const startLiveSimulation = () => {
    if (wsRef.current) { wsRef.current.close(); }
    if (!currentConfig || !currentConfig.machine_categories?.length) {
      alert('Please configure machines first in Setup.');
      return;
    }
    
    const wsUrl = 'wss://factoryservsim-factory-machine-adjuster.onrender.com/api/ws/live';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setLiveSimRunning(true);
      setLiveTick(0);
      let simAdjusters = currentConfig.adjusters;
      
      if (optimizationResults && optimizationResults.per_adjuster_counts) {
        simAdjusters = [];
        let idCounter = 1;
        for (const [profileName, count] of Object.entries(optimizationResults.per_adjuster_counts)) {
          const originalProfile = currentConfig.adjusters.find(a => a.name === profileName);
          const expertise = originalProfile ? originalProfile.expertise : [];
          for (let i = 0; i < count; i++) {
            simAdjusters.push({
              id: idCounter++,
              name: count > 1 ? `${profileName} - ${i + 1}` : profileName,
              expertise: expertise
            });
          }
        }
      }

      ws.send(JSON.stringify({
        simulation_time: currentConfig.simulation_time,
        machine_categories: currentConfig.machine_categories,
        adjusters: simAdjusters,
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'tick') {
        setLiveMachines(data.machines.map(m => ({
          ...m,
          adjusterId: m.assigned_adjuster,
        })));
        setLiveStats(data.stats);
        setLiveTick(data.tick);
        setLiveTotalTime(data.total_time);
      } else if (data.type === 'complete') {
        setLiveSimRunning(false);
      }
    };
    
    ws.onerror = () => { setLiveSimRunning(false); };
    ws.onclose = () => { setLiveSimRunning(false); };
  };

  const stopLiveSimulation = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setLiveSimRunning(false);
  };

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
        // resultsToSave included ...simulationResults and optimization: optimizationResults
        setSimulationResults(historicalItem.results);
        setOptimizationResults(historicalItem.results.optimization || historicalItem.results);
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
    { id: 'config', label: 'Setup', icon: Sliders, always: true },
    { id: 'analytics', label: 'Analytics', icon: LayoutDashboard, always: false, needs: hasResults },
    { id: 'visualizer', label: 'Live Floor', icon: Activity, always: false, needs: !!simulationResults },
    { id: 'history', label: 'History', icon: History, always: true },
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
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">
                  {user?.factory_name || 'Factory Dashboard'}
                </h1>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-semibold">
                  ID: {user?.factory_id || 'FAC001'}
                </p>
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
                  <div className="flex items-center gap-3">
                    {!liveSimRunning ? (
                      <button
                        onClick={startLiveSimulation}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2"
                      >
                        ▶ Start Live Simulation
                      </button>
                    ) : (
                      <button
                        onClick={stopLiveSimulation}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2"
                      >
                        ⏹ Stop
                      </button>
                    )}
                    <button 
                      onClick={() => setActivePage('analytics')}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      ← Back to Analytics
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {liveSimRunning && liveTotalTime > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tick {liveTick} / {liveTotalTime}</span>
                      <span>{Math.round((liveTick / liveTotalTime) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(liveTick / liveTotalTime) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live Stats Row */}
                {liveStats && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-700">{liveStats.running}</div>
                      <div className="text-xs text-emerald-600 font-medium">Running</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-amber-700">{liveStats.waiting}</div>
                      <div className="text-xs text-amber-600 font-medium">In Queue</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700">{liveStats.repairing}</div>
                      <div className="text-xs text-blue-600 font-medium">Under Repair</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-700">{liveStats.idle_adjusters}</div>
                      <div className="text-xs text-purple-600 font-medium">Idle Adjusters</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-slate-700">{liveStats.total_failures}</div>
                      <div className="text-xs text-slate-500 font-medium">Total Failures</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-700">{liveStats.total_repairs}</div>
                      <div className="text-xs text-indigo-500 font-medium">Total Repairs</div>
                    </div>
                  </div>
                )}

                <SingleQueueBar
                  machineQueueCount={liveStats?.waiting || 0}
                  idleAdjusterCount={liveStats?.idle_adjusters || 0}
                />
                <FactoryFloorGrid machines={liveMachines} />
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
