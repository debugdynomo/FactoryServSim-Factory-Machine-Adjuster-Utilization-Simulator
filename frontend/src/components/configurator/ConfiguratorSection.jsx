import React, { useEffect, useState } from 'react';
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
  onConfigChange,
}) {
  const [simulationTime, setSimulationTime] = useState(
    DEFAULT_CONFIG.simulation_time,
  );
  const [categories, setCategories] = useState([]);
  const [adjusters, setAdjusters] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep parent in sync with config whenever it changes
  useEffect(() => {
    onConfigChange?.({
      simulation_time: Number(simulationTime),
      machine_categories: categories,
      adjusters: adjusters,
    });
  }, [simulationTime, categories, adjusters, onConfigChange]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Factory Configurator
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure machine categories and adjuster expertise before running
          the simulation.
        </p>
      </div>

      <PresetSelector presets={presets} onSelect={applyPreset} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="simulation-time"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Simulation time
        </label>
        <input
          id="simulation-time"
          type="number"
          min="1"
          step="1"
          value={simulationTime}
          onChange={(event) => setSimulationTime(event.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
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