import React, { useEffect, useState } from 'react';
import { Settings, Sliders } from 'lucide-react';
import CategoryForm from './CategoryForm';
import AdjusterForm from './AdjusterForm';
import PresetSelector from './PresetSelector';
import ConfigSummary from './ConfigSummary';
import {
  fetchPresets,
  runOptimization,
  runSimulation,
} from '../../api/simulationApi';

const DEFAULT_CONFIG = {
  simulation_time: 10000,
  machine_categories: [],
  adjusters: [],
};

export default function ConfiguratorSection({
  onSimulationComplete,
  onOptimizationComplete,
}) {
  const [simulationTime, setSimulationTime] = useState(
    DEFAULT_CONFIG.simulation_time,
  );
  const [categories, setCategories] = useState([]);
  const [adjusters, setAdjusters] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchPresets()
      .then((result) => {
        if (mounted && Array.isArray(result)) {
          setPresets(result);
        }
      })
      .catch(() => {
        // Built-in presets remain available when the backend is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const applyPreset = (config) => {
    setSimulationTime(config.simulation_time ?? 10000);
    setCategories(config.machine_categories ?? []);
    setAdjusters(config.adjusters ?? []);
    setError('');
  };

  const buildPayload = () => ({
    simulation_time: Number(simulationTime),
    machine_categories: categories.map((category) => ({
      name: category.name.trim(),
      count: Number(category.count),
      mttf: Number(category.mttf),
      mean_repair_time: Number(category.mean_repair_time),
    })),
    adjusters: adjusters.map((adjuster) => ({
      id: Number(adjuster.id),
      name: adjuster.name.trim(),
      expertise: [...adjuster.expertise],
    })),
  });

  const validate = () => {
    if (Number(simulationTime) <= 0) {
      return 'Simulation time must be greater than 0.';
    }

    if (categories.length === 0) {
      return 'Add at least one machine category.';
    }

    if (adjusters.length === 0) {
      return 'Add at least one adjuster.';
    }

    return '';
  };

  const handleSimulation = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await runSimulation(buildPayload());
      onSimulationComplete?.(result);
    } catch (requestError) {
      setError(requestError.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimization = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await runOptimization(buildPayload());
      onOptimizationComplete?.(result);
    } catch (requestError) {
      setError(requestError.message || 'Optimization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
          <Settings className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Factory Configurator
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-medium">
            Configure machine categories and adjuster expertise before running the simulation.
          </p>
        </div>
      </div>

      <PresetSelector presets={presets} onSelect={applyPreset} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Global Settings</h2>
        </div>
        
        <label
          htmlFor="simulation-time"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Simulation time (hours)
        </label>
        <div className="relative max-w-xs">
          <input
            id="simulation-time"
            type="number"
            min="1"
            step="1"
            value={simulationTime}
            onChange={(event) => setSimulationTime(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </section>

      <CategoryForm
        categories={categories}
        onChange={setCategories}
      />

      <AdjusterForm
        adjusters={adjusters}
        categories={categories}
        onChange={setAdjusters}
      />

      <ConfigSummary
        simulationTime={simulationTime}
        categories={categories}
        adjusters={adjusters}
        onSimulation={handleSimulation}
        onOptimization={handleOptimization}
        loading={loading}
        error={error}
      />
    </div>
  );
}