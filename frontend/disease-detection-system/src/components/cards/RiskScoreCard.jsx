import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Activity } from 'lucide-react';

const RiskScoreCard = ({ data, loading, pondId }) => {
  if (loading) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded mb-4"></div>
        <div className="h-24 bg-white/10 rounded mb-4"></div>
        <div className="h-6 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-effect card-shadow rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Disease Risk Score</h2>
        <div className="text-center py-12 text-gray-400">
          No prediction data available. Submit data or wait for automatic calculation.
        </div>
      </div>
    );
  }

  const riskLevel = data.prediction_result?.recommendation?.final_risk_level || 'UNKNOWN';
  const riskColor = {
    HIGH: 'risk-high',
    MEDIUM: 'risk-medium',
    LOW: 'risk-low',
  }[riskLevel] || 'risk-low';

  const riskBadgeClass = {
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }[riskLevel] || 'badge-low';

  const recommendation = data.prediction_result?.recommendation || {};
  const unsupervisedScore = (data.prediction_result?.unsupervised_risk_score * 100 || 0).toFixed(1);

  return (
    <div className="glass-effect card-shadow rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`${riskColor} p-8 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Disease Risk Score</h2>
          <Activity className="w-8 h-8 opacity-80" />
        </div>
        <div className="text-5xl font-bold mb-2">{unsupervisedScore}%</div>
        <div className={riskBadgeClass}>{riskLevel}</div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-4">{recommendation.title}</h3>

        {/* Predictions */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Supervised:</span>
            <span className={`badge-${data.prediction_result?.supervised_prediction?.toLowerCase()}`}>
              {data.prediction_result?.supervised_prediction}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Unsupervised:</span>
            <span className={`badge-${data.prediction_result?.unsupervised_prediction?.toLowerCase()}`}>
              {data.prediction_result?.unsupervised_prediction}
            </span>
          </div>
        </div>

        {/* Probabilities */}
        {data.prediction_result?.supervised_probabilities && (
          <div className="mb-6 py-4 border-t border-b border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">Risk Probabilities</h4>
            <div className="space-y-2">
              {Object.entries(data.prediction_result.supervised_probabilities).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-600 rounded-full"
                        style={{ width: `${(value * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold text-sm w-12 text-right">{(value * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recommended Actions
          </h4>
          <ul className="space-y-2">
            {recommendation.actions?.map((action, idx) => (
              <li key={idx} className="flex gap-3 text-gray-300 text-sm">
                <span className="text-purple-400 font-bold">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Timestamp */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Last Updated: {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskScoreCard;
