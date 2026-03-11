import React from 'react';
import { ChevronDown } from 'lucide-react';

const PondSelector = ({ selectedPond, onPondChange }) => {
  const ponds = ['pond-01', 'pond-02', 'pond-03', 'pond-04', 'pond-05'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-4">
        <label className="text-white font-semibold">Select Pond:</label>
        <div className="relative">
          <select
            value={selectedPond}
            onChange={(e) => onPondChange(e.target.value)}
            className="appearance-none bg-white/10 border border-white/20 text-white px-4 py-2 pr-10 rounded-lg cursor-pointer hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {ponds.map(pond => (
              <option key={pond} value={pond} className="bg-slate-900 text-white">
                {pond.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default PondSelector;
