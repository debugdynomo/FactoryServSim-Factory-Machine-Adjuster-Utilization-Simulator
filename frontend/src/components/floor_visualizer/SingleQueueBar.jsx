import React from 'react';
import { Users, AlertTriangle, ArrowRightLeft } from 'lucide-react';

export const SingleQueueBar = ({ machineQueueCount = 0, idleAdjusterCount = 0 }) => {
  // Enforce invariant visually: if one is > 0, the other must be 0 conceptually
  // Even if data implies both, we highlight the invariant visually.
  
  const isMachineQueueActive = machineQueueCount > 0;
  const isAdjusterQueueActive = idleAdjusterCount > 0 && machineQueueCount === 0;

  return (
    <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex-1 flex flex-col items-center w-full">
        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Inoperative Machines</h4>
        <div className={`flex items-center gap-3 p-4 rounded-xl border w-full justify-center transition-all duration-300 ${isMachineQueueActive ? 'border-amber-300 bg-amber-50 shadow-inner' : 'border-slate-100 bg-slate-50/50'}`}>
          <AlertTriangle className={`w-5 h-5 ${isMachineQueueActive ? 'text-amber-600' : 'text-slate-300'}`} />
          <span className={`text-3xl font-bold ${isMachineQueueActive ? 'text-amber-700' : 'text-slate-300'}`}>
            {machineQueueCount}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center px-2 py-4">
        <div className="flex items-center gap-2 bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-md border border-slate-200 uppercase tracking-widest mb-2 shadow-sm">
          Single Queue Invariant
        </div>
        <ArrowRightLeft className="w-5 h-5 text-slate-300" />
        <span className="text-[10px] text-slate-400 mt-2 font-medium uppercase text-center max-w-[140px] tracking-wide">
          Only one queue active
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center w-full">
        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Idle Adjusters</h4>
        <div className={`flex items-center gap-3 p-4 rounded-xl border w-full justify-center transition-all duration-300 ${isAdjusterQueueActive ? 'border-emerald-300 bg-emerald-50 shadow-inner' : 'border-slate-100 bg-slate-50/50'}`}>
          <Users className={`w-5 h-5 ${isAdjusterQueueActive ? 'text-emerald-600' : 'text-slate-300'}`} />
          <span className={`text-3xl font-bold ${isAdjusterQueueActive ? 'text-emerald-700' : 'text-slate-300'}`}>
            {idleAdjusterCount}
          </span>
        </div>
      </div>
    </div>
  );
};
