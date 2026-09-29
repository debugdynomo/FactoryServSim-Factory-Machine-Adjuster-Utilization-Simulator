import React from 'react';
import { MachineCard } from './MachineCard';

export const FactoryFloorGrid = ({ machines = [] }) => {
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Factory Floor Grid</h3>
      
      {machines.length === 0 ? (
        <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-500">
          No machines configured.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-[600px] overflow-y-auto p-2">
          {machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
};
