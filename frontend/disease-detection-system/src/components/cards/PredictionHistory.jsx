import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

const PredictionHistory = ({ predictions, loading }) => {
  if (loading) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-4"></div>
        <div className="h-80 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Prediction History</h2>
        <div className="text-center text-gray-400 py-12">
          No historical predictions available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = predictions.slice(-30).map(pred => {
    const result = pred.prediction_result || {};
    const timestamp = new Date(pred.timestamp || Date.now());
    
    return {
      time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: timestamp.toLocaleDateString(),
      riskScore: (result.unsupervised_risk_score * 100) || 0,
      supervised: result.supervised_prediction === 'HIGH' ? 3 : result.supervised_prediction === 'MEDIUM' ? 2 : 1,
      unsupervised: result.unsupervised_prediction === 'HIGH' ? 3 : result.unsupervised_prediction === 'MEDIUM' ? 2 : 1,
      timestamp: timestamp.getTime(),
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  // Risk level counts
  const riskCounts = {
    HIGH: predictions.filter(p => p.prediction_result?.recommendation?.final_risk_level === 'HIGH').length,
    MEDIUM: predictions.filter(p => p.prediction_result?.recommendation?.final_risk_level === 'MEDIUM').length,
    LOW: predictions.filter(p => p.prediction_result?.recommendation?.final_risk_level === 'LOW').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm mb-1">High Risk</div>
              <div className="text-3xl font-bold text-red-400">{riskCounts.HIGH}</div>
            </div>
            <div className="text-red-400/30 text-4xl">⚠️</div>
          </div>
        </div>
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm mb-1">Medium Risk</div>
              <div className="text-3xl font-bold text-yellow-400">{riskCounts.MEDIUM}</div>
            </div>
            <div className="text-yellow-400/30 text-4xl">⚡</div>
          </div>
        </div>
        <div className="glass-effect card-shadow rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm mb-1">Low Risk</div>
              <div className="text-3xl font-bold text-green-400">{riskCounts.LOW}</div>
            </div>
            <div className="text-green-400/30 text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Risk Score Trend
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              domain={[0, 100]}
              label={{ value: 'Risk Score (%)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.7)' } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              domain={[0, 3]}
              label={{ value: 'Risk Level', angle: 90, position: 'insideRight', style: { fill: 'rgba(255,255,255,0.7)' } }}
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
              yAxisId="left"
              type="monotone" 
              dataKey="riskScore" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              name="Risk Score (%)"
            />
            <Bar 
              yAxisId="right"
              dataKey="supervised" 
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              name="Supervised"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Predictions Table */}
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Recent Predictions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Timestamp</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Risk Score</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Supervised</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Unsupervised</th>
                <th className="text-left text-gray-400 font-semibold py-3 px-4">Final Level</th>
              </tr>
            </thead>
            <tbody>
              {predictions.slice(-10).reverse().map((pred, idx) => {
                const result = pred.prediction_result || {};
                const riskLevel = result.recommendation?.final_risk_level || 'UNKNOWN';
                const badgeClass = {
                  HIGH: 'badge-high',
                  MEDIUM: 'badge-medium',
                  LOW: 'badge-low',
                }[riskLevel] || 'badge-low';

                return (
                  <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(pred.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-yellow-400">
                        {(result.unsupervised_risk_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge-${result.supervised_prediction?.toLowerCase()}`}>
                        {result.supervised_prediction}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge-${result.unsupervised_prediction?.toLowerCase()}`}>
                        {result.unsupervised_prediction}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={badgeClass}>{riskLevel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PredictionHistory;
