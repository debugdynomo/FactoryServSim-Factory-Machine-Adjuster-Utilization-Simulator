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

  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => setWizardStep((prev) => Math.min(prev + 1, totalSteps));
  const handlePrev = () => setWizardStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Factory Configurator Wizard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Step {wizardStep} of {totalSteps}: {wizardStep === 1 ? 'Configure Machines' : wizardStep === 2 ? 'Configure Adjusters' : 'Review & Run'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* Wizard Steps */}
      <div className="min-h-[400px]">
        {wizardStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Provide presets right at the start to save time */}
            <div className="bg-slate-50 border border-indigo-100 p-4 rounded-xl">
              <h2 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                ⚡ Quick Start: Choose a Preset
              </h2>
              <PresetSelector presets={presets} onSelect={applyPreset} />
            </div>
            
            <CategoryForm categories={categories} onChange={setCategories} />
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <AdjusterForm adjusters={adjusters} categories={categories} onChange={setAdjusters} />
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <label
                htmlFor="simulation-time"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Simulation time (hours)
              </label>
              <input
                id="simulation-time"
                type="number"
                min="1"
                step="1"
                value={simulationTime}
                onChange={(event) => setSimulationTime(event.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </section>

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
        )}
      </div>

      {/* Wizard Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-200">
        <button
          onClick={handlePrev}
          disabled={wizardStep === 1}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            wizardStep === 1
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          ← Back
        </button>

        {wizardStep < totalSteps ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2"
          >
            Next Step →
          </button>
        ) : (
          <div className="text-sm text-slate-500 italic">
            Ready to Run! Click a button above.
          </div>
        )}
      </div>
    </div>
  );
}