import React from 'react';
import { Droplets, Thermometer, Waves } from 'lucide-react';

const EnvironmentalMetrics = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Environmental Metrics</h3>
        <div className="text-center text-gray-400 py-8">No data available</div>
      </div>
    );
  }

  const metrics = [
    { key: 'DO', label: 'Dissolved Oxygen', icon: Droplets, unit: 'mg/L', color: 'from-blue-400 to-cyan-600' },
    { key: 'temp', label: 'Temperature', icon: Thermometer, unit: '°C', color: 'from-orange-400 to-red-600' },
    { key: 'pH', label: 'pH Level', icon: Waves, unit: '', color: 'from-green-400 to-emerald-600' },
    { key: 'salinity', label: 'Salinity', icon: Droplets, unit: 'ppt', color: 'from-purple-400 to-pink-600' },
  ];

  return (
    <div className="glass-effect card-shadow rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Environmental Metrics</h3>
      <div className="space-y-4">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const value = data[metric.key];
          if (value === undefined) return null;

          return (
            <div key={metric.key} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">{metric.label}</div>
                    <div className="text-white font-bold">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                      <span className="text-gray-400 ml-1">{metric.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnvironmentalMetrics;
