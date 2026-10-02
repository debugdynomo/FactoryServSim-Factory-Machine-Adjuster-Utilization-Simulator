import React from 'react';
import { Factory, Briefcase, Server } from 'lucide-react';

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
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="mt-1 rounded-md bg-amber-100 p-2 text-amber-700">
          <Factory className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Factory Presets
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Start with a predefined factory configuration.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availablePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.config)}
            className="group relative flex flex-col items-start rounded-xl border-2 border-slate-200 bg-white p-5 text-left transition-all hover:border-slate-900 hover:shadow-md"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {preset.source === 'backend' ? (
                  <Server className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                ) : (
                  <Briefcase className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                )}
                <h3 className="font-bold text-slate-900">{preset.name}</h3>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                {preset.source === 'backend' ? 'Custom' : 'Preset'}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {preset.description}
            </p>
            <div className="mt-4 flex gap-2 w-full border-t border-slate-100 pt-3">
               <span className="text-xs font-semibold text-slate-400">
                 Machines: {preset.config.machine_categories.reduce((acc, cat) => acc + cat.count, 0)}
               </span>
               <span className="text-xs font-semibold text-slate-400">&bull;</span>
               <span className="text-xs font-semibold text-slate-400">
                 Adjusters: {preset.config.adjusters.length}
               </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}