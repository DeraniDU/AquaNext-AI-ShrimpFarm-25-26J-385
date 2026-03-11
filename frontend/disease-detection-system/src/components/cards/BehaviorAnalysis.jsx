import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Zap } from 'lucide-react';

const BehaviorAnalysis = ({ behaviors, loading }) => {
  if (loading) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-4"></div>
        <div className="h-80 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (!behaviors || behaviors.length === 0) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Behavior Analysis</h2>
        <div className="text-center text-gray-400 py-12">
          No behavioral data available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = behaviors.slice(-50).map((behavior, idx) => ({
    index: idx,
    time: new Date(behavior.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    activityIndex: behavior.activity_index || 0,
    activityStd: behavior.activity_std || 0,
    dropRatio: behavior.drop_ratio || 0,
    abnormal: behavior.abnormal || 0,
  }));

  // Statistics
  const stats = {
    avgActivity: (behaviors.reduce((sum, b) => sum + (b.activity_index || 0), 0) / behaviors.length).toFixed(3),
    avgActivityStd: (behaviors.reduce((sum, b) => sum + (b.activity_std || 0), 0) / behaviors.length).toFixed(3),
    abnormalCount: behaviors.filter(b => b.abnormal > 0).length,
    totalPoints: behaviors.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Avg Activity Index</div>
          <div className="text-3xl font-bold text-blue-400">{stats.avgActivity}</div>
        </div>
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Avg Activity Std Dev</div>
          <div className="text-3xl font-bold text-purple-400">{stats.avgActivityStd}</div>
        </div>
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Abnormal Events</div>
          <div className="text-3xl font-bold text-red-400">{stats.abnormalCount}</div>
        </div>
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-2">Total Data Points</div>
          <div className="text-3xl font-bold text-green-400">{stats.totalPoints}</div>
        </div>
      </div>

      {/* Activity Index Chart */}
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Shrimp Activity Index Over Time
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="activityIndex" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorActivity)"
              name="Activity Index"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Drop Ratio and Variability */}
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6" />
          Behavior Metrics
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', color: 'rgba(255,255,255,0.7)' }} />
            <Line 
              type="monotone" 
              dataKey="dropRatio" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              name="Drop Ratio"
            />
            <Line 
              type="monotone" 
              dataKey="activityStd" 
              stroke="#a855f7" 
              strokeWidth={2}
              dot={false}
              name="Activity Std Dev"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Behaviors Table */}
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Behavioral Data Points</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Timestamp</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Activity Index</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Std Dev</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Drop Ratio</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Abnormal</th>
              </tr>
            </thead>
            <tbody>
              {behaviors.slice(-15).reverse().map((behavior, idx) => (
                <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-gray-300">
                    {new Date(behavior.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-blue-400">
                      {behavior.activity_index?.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-purple-400">
                      {behavior.activity_std?.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-yellow-400">
                      {behavior.drop_ratio?.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      behavior.abnormal > 0 
                        ? 'bg-red-500/20 text-red-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {behavior.abnormal > 0 ? '⚠️ Yes' : '✓ No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BehaviorAnalysis;
