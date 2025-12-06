import React from 'react';
import { Activity, Ear } from 'lucide-react';

export const Logo: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300`}>
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 shadow-lg shadow-blue-900/20 text-white">
        <Ear size={20} className="absolute opacity-20 transform scale-150" />
        <Activity size={22} className="relative z-10" />
      </div>
      
      {!collapsed && (
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white tracking-tight leading-none font-display">
            Myringo<span className="text-teal-400">Analysis</span>
          </h1>
          <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
            Surgical Outcomes AI
          </span>
        </div>
      )}
    </div>
  );
};
