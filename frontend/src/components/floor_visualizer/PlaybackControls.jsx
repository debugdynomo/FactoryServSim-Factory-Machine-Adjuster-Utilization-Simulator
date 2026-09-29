import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, FastForward } from 'lucide-react';

export const PlaybackControls = ({ 
  isPlaying, 
  onTogglePlay, 
  onStep, 
  onReset, 
  speed, 
  onSpeedChange 
}) => {
  return (
    <div className="w-full bg-slate-800 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onTogglePlay}
          className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
        
        <button 
          onClick={onStep}
          disabled={isPlaying}
          className={`p-2 rounded-full transition-colors focus:outline-none ${isPlaying ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300 hover:bg-slate-700 hover:text-white'}`}
          title="Step Forward"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <button 
          onClick={onReset}
          className="p-2 rounded-full text-gray-300 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none"
          title="Reset Simulation"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-xs w-full">
        <div className="flex justify-between w-full text-xs text-gray-400 font-semibold mb-2">
          <span>Speed: {speed}x</span>
          <FastForward className="w-4 h-4" />
        </div>
        <input 
          type="range" 
          min="1" 
          max="20" 
          step="1" 
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between w-full text-[10px] text-gray-500 mt-1">
          <span>1x</span>
          <span>5x</span>
          <span>20x</span>
        </div>
      </div>
      
      <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2 border border-slate-600">
        <div className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-sm font-mono">{isPlaying ? 'LIVE STREAMING' : 'PAUSED'}</span>
      </div>

    </div>
  );
};
