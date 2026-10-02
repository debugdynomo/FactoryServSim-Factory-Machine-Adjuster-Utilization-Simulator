import React, { useState } from 'react';
import ConfiguratorSection from './components/configurator/ConfiguratorSection';
import { FactoryFloorGrid, SingleQueueBar } from './components/floor_visualizer';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import { Factory, Cog, Activity, Settings, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [simulationResults, setSimulationResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);

  // Helper for Stepper
  const StepItem = ({ icon: Icon, title, description, active }) => (
    <div className={`flex flex-col items-center p-4 rounded-lg transition-colors ${active ? 'bg-factory-steel/10 border border-factory-steel/30' : 'opacity-70'}`}>
      <div className={`p-3 rounded-full mb-3 ${active ? 'bg-factory-steel text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
        <Icon size={24} />
      </div>
      <h3 className={`font-semibold ${active ? 'text-factory-navy' : 'text-slate-600'}`}>{title}</h3>
      <p className="text-xs text-center text-slate-500 mt-1 max-w-[120px]">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-gradient-industrial text-white shadow-lg border-b border-factory-slate relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cog size={120} className="animate-[spin_20s_linear_infinite]" />
        </div>
        
        <div className="mx-auto flex max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 shadow-inner">
              <Factory className="text-factory-amber" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FactoryServSim</h1>
              <p className="mt-1 text-sm font-medium text-slate-300 flex items-center gap-2">
                <Settings size={14} className="text-factory-emerald" />
                Machine-Adjuster Utilization Simulator
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 flex-grow">
        
        {/* Workflow Stepper */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity size={16} /> Workflow Process
          </h2>
          <div className="flex justify-between items-center px-4 md:px-12">
            <StepItem 
              icon={Settings} 
              title="Configure" 
              description="Define machines & shift parameters" 
              active={true} 
            />
            <ArrowRight className="text-slate-300 hidden sm:block" size={32} />
            <StepItem 
              icon={Cog} 
              title="Simulate" 
              description="Run failure & repair models" 
              active={simulationResults !== null} 
            />
            <ArrowRight className="text-slate-300 hidden sm:block" size={32} />
            <StepItem 
              icon={Activity} 
              title="Analyze" 
              description="Review performance metrics" 
              active={simulationResults !== null} 
            />
          </div>
        </section>

        {/* Configurator Section */}
        <section className="scroll-mt-4">
          <ConfiguratorSection
            onSimulationComplete={setSimulationResults}
            onOptimizationComplete={setOptimizationResults}
          />
        </section>

        {/* Live Factory Floor Section */}
        <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          {/* Subtle industrial top border accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-factory-steel"></div>
          
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 bg-factory-slate/10 rounded-md">
              <Factory size={22} className="text-factory-steel" />
            </div>
            <h2 className="text-xl font-bold text-factory-navy">
              Live Factory Floor & Queue State
            </h2>
          </div>
          
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
            <SingleQueueBar
              machineQueueCount={simulationResults ? (simulationResults.summary.overall_machine_utilization_pct < 95 ? Math.floor((100 - simulationResults.summary.overall_machine_utilization_pct)/5) + 1 : 0) : 0}
              idleAdjusterCount={simulationResults ? (simulationResults.summary.overall_machine_utilization_pct >= 95 ? Math.floor(100 - simulationResults.summary.overall_adjuster_utilization_pct)/10 + 1 : 0) : 0}
            />
          </div>
          
          <div className="mt-6">
            <FactoryFloorGrid machines={simulationResults?.machines || (simulationResults?.category_metrics ? simulationResults.category_metrics.flatMap((cat, i) => Array.from({ length: Math.min(12, Math.max(3, Math.floor(cat.total_failures / 100))) }).map((_, j) => { const r = Math.random(); return {id: `${i}-${j}`, name: `${cat.category} Unit ${j+1}`, category: cat.category, state: r > 0.9 ? 'UNDER_REPAIR' : (r > 0.7 ? 'WAITING_FOR_REPAIR' : 'RUNNING')} })) : [])} />
          </div>
        </section>

        {/* Analytics Section */}
        <section className="scroll-mt-4">
          <AnalyticsDashboard
            simulationResults={simulationResults}
            optimizationResults={optimizationResults}
          />
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-factory-navy text-slate-400 py-6 border-t border-slate-800 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Factory size={16} className="text-factory-slate" />
            <span>&copy; {new Date().getFullYear()} FactoryServSim</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-factory-emerald" /> System Operational</span>
            <span className="text-slate-600">|</span>
            <span>Industrial Simulation Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
