import React from 'react';

export default function ConfigSummary({
  simulationTime,
  categories,
  adjusters,
  onRunAnalysis,
  loading,
  error,
}) {
  const totalMachines = categories.reduce(
    (total, category) => total + Number(category.count || 0),
    0,
  );

  const uncoveredCategories = categories
    .filter(cat => cat.name && !adjusters.some(adj => adj.expertise.includes(cat.name)))
    .map(cat => cat.name);

  const canRun =
    Number(simulationTime) > 0 &&
    categories.length > 0 &&
    categories.every(
      (category) =>
        category.name &&
        Number(category.count) >= 0 &&
        Number(category.mttf) > 0 &&
        Number(category.mean_repair_time) > 0,
    ) &&
    adjusters.length > 0 &&
    adjusters.every((adjuster) => adjuster.expertise.length > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Configuration Summary
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the configuration before running the full analysis.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Machine categories
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {categories.length}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total machines
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalMachines}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Adjusters
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {adjusters.length}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Simulation time</span>
          <span className="font-medium text-slate-900">
            {simulationTime}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {uncoveredCategories.length > 0 && (
        <div className="mt-4 flex rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
          <span className="mr-2">⚠️</span>
          <div>
            <strong>Coverage Gap Warning:</strong> The following machine categories have no adjuster with matching expertise: {uncoveredCategories.join(', ')}. Machines in these categories will not be repaired during simulation.
          </div>
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={!canRun || loading}
          onClick={onRunAnalysis}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 font-bold text-white text-base transition-all hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Running Full Analysis...
            </>
          ) : (
            <>
              🚀 Run Full Analysis
            </>
          )}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">
          Runs both Simulation & Optimization together
        </p>
      </div>
    </section>
  );
}