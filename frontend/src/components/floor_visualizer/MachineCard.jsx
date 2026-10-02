import React from 'react';
import { Settings, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MachineCard = ({ machine }) => {
  // machine: { id: string, name: string, category: string, state: 'RUNNING' | 'WAITING_FOR_REPAIR' | 'UNDER_REPAIR', adjusterId?: string }
  
  let bgClass = '';
  let borderClass = '';
  let Icon = Settings;
  let statusText = '';
  let iconColor = '';

  switch (machine.state) {
    case 'RUNNING':
      bgClass = 'bg-emerald-50';
      borderClass = 'border-emerald-200';
      Icon = CheckCircle2;
      statusText = 'Running';
      iconColor = 'text-emerald-600';
      break;
    case 'WAITING_FOR_REPAIR':
      bgClass = 'bg-amber-50';
      borderClass = 'border-amber-200';
      Icon = AlertTriangle;
      statusText = 'Waiting in Queue';
      iconColor = 'text-amber-600';
      break;
    case 'UNDER_REPAIR':
      bgClass = 'bg-blue-50';
      borderClass = 'border-blue-200';
      Icon = Wrench;
      statusText = `Under Repair (Adj. ${machine.adjusterId})`;
      iconColor = 'text-blue-600';
      break;
    default:
      bgClass = 'bg-slate-50';
      borderClass = 'border-slate-200';
      Icon = Settings;
      statusText = 'Unknown';
      iconColor = 'text-slate-500';
  }

  return (
    <div className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md ${bgClass} ${borderClass}`}>
      <div className={`p-2 rounded-lg bg-white/60 mb-3 shadow-sm ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-semibold text-sm text-slate-800 tracking-tight">{machine.name}</span>
      <span className="text-xs text-slate-500 font-medium mb-3">{machine.category}</span>
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-white/50 shadow-sm uppercase tracking-wider ${iconColor}`}>
        {statusText}
      </span>
    </div>
  );
};
