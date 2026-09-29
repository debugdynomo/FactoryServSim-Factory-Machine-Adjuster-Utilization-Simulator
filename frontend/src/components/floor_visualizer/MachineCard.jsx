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
      bgClass = 'bg-green-50';
      borderClass = 'border-green-200';
      Icon = CheckCircle2;
      statusText = 'Running';
      iconColor = 'text-green-500';
      break;
    case 'WAITING_FOR_REPAIR':
      bgClass = 'bg-yellow-50';
      borderClass = 'border-yellow-200';
      Icon = AlertTriangle;
      statusText = 'Waiting in Queue';
      iconColor = 'text-yellow-500';
      break;
    case 'UNDER_REPAIR':
      bgClass = 'bg-blue-50';
      borderClass = 'border-blue-200';
      Icon = Wrench;
      statusText = `Under Repair (Adj. ${machine.adjusterId})`;
      iconColor = 'text-blue-500';
      break;
    default:
      bgClass = 'bg-gray-50';
      borderClass = 'border-gray-200';
      Icon = Settings;
      statusText = 'Unknown';
      iconColor = 'text-gray-500';
  }

  return (
    <div className={`p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center transition-colors ${bgClass} ${borderClass}`}>
      <Icon className={`w-6 h-6 mb-2 ${iconColor}`} />
      <span className="font-semibold text-sm text-gray-800">{machine.name}</span>
      <span className="text-xs text-gray-500 mb-1">{machine.category}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white bg-opacity-50 ${iconColor}`}>
        {statusText}
      </span>
    </div>
  );
};
