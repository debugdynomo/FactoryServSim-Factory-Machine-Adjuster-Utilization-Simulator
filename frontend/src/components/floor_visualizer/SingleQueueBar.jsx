import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';

export const SingleQueueBar = ({ machineQueueCount = 0, idleAdjusterCount = 0 }) => {
  // Enforce invariant visually: if one is > 0, the other must be 0 conceptually
  // Even if data implies both, we highlight the invariant visually.
  
  const isMachineQueueActive = machineQueueCount > 0;
  const isAdjusterQueueActive = idleAdjusterCount > 0 && machineQueueCount === 0;

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex-1 flex flex-col items-center">
        <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Inoperative Machines</h4>
        <div className={`flex items-center gap-2 p-3 rounded-lg border-2 w-full justify-center transition-all duration-300 ${isMachineQueueActive ? 'border-yellow-400 bg-yellow-50 shadow-inner' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
          <AlertTriangle className={`w-6 h-6 ${isMachineQueueActive ? 'text-yellow-500 animate-pulse' : 'text-gray-300'}`} />
          <span className={`text-2xl font-bold ${isMachineQueueActive ? 'text-yellow-700' : 'text-gray-400'}`}>
            {machineQueueCount}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center px-4">
        <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-1">
          SINGLE QUEUE INVARIANT
        </div>
        <div className="h-0.5 w-16 bg-gray-300"></div>
        <span className="text-[10px] text-gray-400 mt-1 uppercase text-center max-w-[120px]">
          Only one queue can be active at a time
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Idle Adjusters</h4>
        <div className={`flex items-center gap-2 p-3 rounded-lg border-2 w-full justify-center transition-all duration-300 ${isAdjusterQueueActive ? 'border-green-400 bg-green-50 shadow-inner' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
          <Users className={`w-6 h-6 ${isAdjusterQueueActive ? 'text-green-500 animate-bounce' : 'text-gray-300'}`} />
          <span className={`text-2xl font-bold ${isAdjusterQueueActive ? 'text-green-700' : 'text-gray-400'}`}>
            {idleAdjusterCount}
          </span>
        </div>
      </div>
    </div>
  );
};
