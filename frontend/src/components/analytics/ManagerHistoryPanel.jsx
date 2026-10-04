import React, { useState, useEffect } from 'react';
import { 
  BookmarkCheck, 
  History, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Calendar, 
  Cpu, 
  Users, 
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  listFactories, 
  createFactory, 
  saveReport, 
  getManagerHistory 
} from '../../api/authApi';

/**
 * ManagerHistoryPanel — Full report management, history viewer, and manual report save.
 */
export default function ManagerHistoryPanel({
  currentConfig,
  simulationResults,
  optimizationResults,
  onLoadHistoricalRun,
}) {
  const [factories, setFactories] = useState([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [newFactoryName, setNewFactoryName] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [customReportName, setCustomReportName] = useState('');
  const [activeView, setActiveView] = useState('save'); // 'save' or 'history'

  const refreshData = async () => {
    setLoading(true);
    try {
      const [facList, histList] = await Promise.all([
        listFactories().catch(() => []),
        getManagerHistory().catch(() => []),
      ]);
      setFactories(facList || []);
      if (facList && facList.length > 0 && !selectedFactoryId) {
        setSelectedFactoryId(facList[0].id);
      }
      setHistory(histList || []);
    } catch (err) {
      console.warn('Error loading factories/history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateFactory = async (e) => {
    e.preventDefault();
    if (!newFactoryName.trim()) return;
    try {
      const created = await createFactory(newFactoryName.trim());
      setNewFactoryName('');
      setStatusMsg({ text: `Factory "${created.factory_name}" created!`, type: 'success' });
      await refreshData();
      setSelectedFactoryId(created.id);
    } catch (err) {
      setStatusMsg({ text: err.message || 'Failed creating factory', type: 'error' });
    }
  };

  const handleSaveCurrentReport = async () => {
    if (!selectedFactoryId) {
      setStatusMsg({ text: 'Please select or create a factory first.', type: 'error' });
      return;
    }

    const hasSim = !!simulationResults;
    const hasOpt = !!optimizationResults;

    if (!hasSim && !hasOpt) {
      setStatusMsg({ text: 'No simulation or optimization run has been executed yet to save.', type: 'error' });
      return;
    }

    setSaving(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const reportType = hasOpt ? 'optimization' : 'simulation';
      const resultsToSave = hasOpt ? { ...simulationResults, optimization: optimizationResults } : simulationResults;

      const payload = {
        report_name: customReportName.trim() || undefined,
        report_type: reportType,
        simulation_time: currentConfig?.simulation_time || 10000,
        machine_config: currentConfig?.machine_categories || [],
        adjuster_config: currentConfig?.adjusters || [],
        results: resultsToSave || {},
        optimized_adjuster_counts: optimizationResults?.per_category_adjusters || undefined,
        per_adjuster_counts: optimizationResults?.per_adjuster_counts || undefined,
      };

      const saved = await saveReport(selectedFactoryId, payload);
      setStatusMsg({ text: `Report "${saved.report_name}" successfully saved to MongoDB database!`, type: 'success' });
      setCustomReportName('');
      await refreshData();
    } catch (err) {
      setStatusMsg({ text: err.message || 'Failed to save report', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedWork = !!simulationResults || !!optimizationResults;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-indigo-600" />
            Factory & Simulation Reports Manager
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Store useful runs, organize by factory, and review simulation history in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('save')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeView === 'save'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💾 Save Report
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
          </button>
          <button
            onClick={refreshData}
            title="Refresh database records"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg.text && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* VIEW 1: SAVE ACTIVE RUN */}
      {activeView === 'save' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Factory Selector / Creator */}
          <div className="space-y-4 lg:border-r lg:border-slate-100 lg:pr-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Target Factory
              </label>
              {factories.length > 0 ? (
                <select
                  value={selectedFactoryId}
                  onChange={(e) => setSelectedFactoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      🏭 {f.factory_name} ({f.report_count || 0} reports)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  No factories found. Create one below to save reports.
                </p>
              )}
            </div>

            <form onSubmit={handleCreateFactory} className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                + Create New Factory Profile
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Pune Plant Alpha"
                  value={newFactoryName}
                  onChange={(e) => setNewFactoryName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newFactoryName.trim()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Report Metadata & Action */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Report Title / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. High Machine Load - Q3 Benchmark"
                value={customReportName}
                onChange={(e) => setCustomReportName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Run Snapshot Preview */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Active Simulation Status
                </p>
                {hasUnsavedWork ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ✓ Ready to Save
                    </span>
                    <span className="text-xs text-slate-600">
                      Mach. Util:{' '}
                      <strong className="text-slate-900">
                        {simulationResults?.summary?.overall_machine_utilization_pct ?? 'N/A'}%
                      </strong>
                    </span>
                    <span className="text-xs text-slate-600">
                      Adjuster Util:{' '}
                      <strong className="text-slate-900">
                        {simulationResults?.summary?.overall_adjuster_utilization_pct ?? 'N/A'}%
                      </strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    No run in memory. Click "Run Simulation" or "Optimize Staffing" above first.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveCurrentReport}
                disabled={!hasUnsavedWork || saving || !selectedFactoryId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    Save Simulation Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MANAGER HISTORY LOG */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">No saved reports in your history yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Run a simulation and click "Save Simulation Report" to store it in MongoDB.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700">
                        {item.factory_name || 'Factory'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {item.report_name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                        {item.report_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                        Machine Util: <strong className="text-slate-800">{item.machine_utilization_pct ?? 'N/A'}%</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Worker Util: <strong className="text-slate-800">{item.adjuster_utilization_pct ?? 'N/A'}%</strong>
                      </span>
                      {item.optimized_adjuster_counts && (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                          🎯 Staffing Recipe Saved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onLoadHistoricalRun && (
                      <button
                        onClick={() => onLoadHistoricalRun(item)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        Load to Dashboard <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
