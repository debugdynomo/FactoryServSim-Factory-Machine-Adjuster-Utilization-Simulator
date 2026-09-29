import React from 'react';

const BUILT_IN_PRESETS = [
  {
    id: 'automotive',
    name: 'Automotive Plant',
    description: '200 Lathes, 50 Turning, 80 Drilling, 30 Soldering',
    config: {
      simulation_time: 10000,
      machine_categories: [
        { name: 'Lathe', count: 200, mttf: 100, mean_repair_time: 10 },
        { name: 'Turning', count: 50, mttf: 150, mean_repair_time: 12 },
        { name: 'Drilling', count: 80, mttf: 80, mean_repair_time: 8 },
        { name: 'Soldering', count: 30, mttf: 200, mean_repair_time: 15 },
      ],
      adjusters: [
        { id: 1, name: 'Adjuster 1', expertise: ['Lathe', 'Turning'] },
        { id: 2, name: 'Adjuster 2', expertise: ['Drilling', 'Soldering'] },
        {
          id: 3,
          name: 'Adjuster 3',
          expertise: ['Lathe', 'Drilling', 'Turning'],
        },
      ],
    },
  },
  {
    id: 'small',
    name: 'Small Factory',
    description: '10 Lathes, 5 Drilling, 2 Adjusters',
    config: {
      simulation_time: 5000,
      machine_categories: [
        { name: 'Lathe', count: 10, mttf: 100, mean_repair_time: 10 },
        { name: 'Drilling', count: 5, mttf: 80, mean_repair_time: 8 },
      ],
      adjusters: [
        { id: 1, name: 'Adjuster 1', expertise: ['Lathe', 'Drilling'] },
        { id: 2, name: 'Adjuster 2', expertise: ['Lathe'] },
      ],
    },
  },
];

export default function PresetSelector({ presets = [], onSelect }) {
  const availablePresets = [
    ...BUILT_IN_PRESETS,
    ...presets
      .filter((preset) => preset?.id && preset?.config)
      .map((preset) => ({
        ...preset,
        source: 'backend',
      })),
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Factory Presets
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Start with a predefined factory configuration.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availablePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.config)}
            className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{preset.name}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                Preset
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {preset.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}