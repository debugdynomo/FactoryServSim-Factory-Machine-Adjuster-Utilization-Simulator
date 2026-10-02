import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, FastForward, Activity } from 'lucide-react';

export const PlaybackControls = ({ 
  isPlaying, 
  onTogglePlay, 
  onStep, 
  onReset, 
  speed, 
  onSpeedChange 
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onTogglePlay}
          className="bg-[#1e3a5f] hover:bg-blue-800 text-white p-3.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        
        <div className="w-px h-8 bg-slate-700 mx-2"></div>
        
        <button 
          onClick={onStep}
          disabled={isPlaying}
          className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none ${isPlaying ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          title="Step Forward"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <button 
          onClick={onReset}
          className="p-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200 focus:outline-none"
          title="Reset Simulation"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-sm w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
        <div className="flex justify-between w-full text-[11px] text-slate-400 font-semibold mb-3 uppercase tracking-wider">
          <span>Simulation Speed: {speed}x</span>
          <FastForward className="w-4 h-4 text-slate-500" />
        </div>
        <input 
          type="range" 
          min="1" 
          max="20" 
          step="1" 
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#1e3a5f] hover:accent-blue-500 transition-colors"
        />
        <div className="flex justify-between w-full text-[10px] font-medium text-slate-500 mt-2">
          <span>1x</span>
          <span>10x</span>
          <span>20x</span>
        </div>
      </div>
      
      <div className="flex items-center bg-slate-800/80 rounded-lg px-4 py-2.5 border border-slate-700 shadow-inner min-w-[160px] justify-center">
        {isPlaying ? (
          <Activity className="w-4 h-4 text-emerald-500 mr-2 animate-pulse" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-500 mr-2"></div>
        )}
        <span className={`text-xs font-bold tracking-widest uppercase ${isPlaying ? 'text-emerald-500' : 'text-slate-400'}`}>
          {isPlaying ? 'Live Active' : 'Paused'}
        </span>
      </div>

    </div>
  );
};
