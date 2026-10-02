import React from 'react';
import { Cpu, Users, Clock, CheckCircle2, Play, Activity } from 'lucide-react';

export default function ConfigSummary({
  simulationTime,
  categories,
  adjusters,
  onSimulation,
  onOptimization,
  loading,
  error,
}) {
  const totalMachines = categories.reduce(
    (total, category) => total + Number(category.count || 0),
    0,
  );

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
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="mt-1 rounded-md bg-emerald-100 p-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Configuration Summary
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Review your factory parameters before executing tasks.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col justify-center rounded-xl bg-slate-900 p-5 text-white shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Machine Categories
            </p>
          </div>
          <p className="text-3xl font-extrabold">
            {categories.length}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-slate-900 p-5 text-white shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Machines
            </p>
          </div>
          <p className="text-3xl font-extrabold">
            {totalMachines}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-slate-900 p-5 text-white shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Adjusters
            </p>
          </div>
          <p className="text-3xl font-extrabold">
            {adjusters.length}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Simulation Time (hours)</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">
            {simulationTime}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          disabled={!canRun || loading}
          onClick={onSimulation}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-5 w-5" />
          {loading ? 'Running...' : 'Run Simulation'}
        </button>

        <button
          type="button"
          disabled={!canRun || loading}
          onClick={onOptimization}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-900 px-6 py-4 text-lg font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Activity className="h-5 w-5" />
          {loading ? 'Processing...' : 'Optimize Adjuster Count'}
        </button>
      </div>
    </section>
  );
}