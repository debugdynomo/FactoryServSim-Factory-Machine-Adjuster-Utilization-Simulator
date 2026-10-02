import React from 'react';
import { MachineCard } from './MachineCard';
import { LayoutGrid, Factory } from 'lucide-react';

export const FactoryFloorGrid = ({ machines = [] }) => {
  return (
    <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
        <LayoutGrid className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Factory Floor Grid</h3>
      </div>
      
      {machines.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-56 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200 text-slate-400">
          <Factory className="w-10 h-10 mb-3 text-slate-300" />
          <span className="font-medium">No machines configured.</span>
          <span className="text-sm mt-1">Add machines to monitor their status on the floor.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 max-h-[600px] overflow-y-auto p-1">
          {machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
};
