import React, { useState, useEffect } from 'react';
import RiskScoreCard from './cards/RiskScoreCard';
import PredictionHistory from './cards/PredictionHistory';
import BehaviorAnalysis from './cards/BehaviorAnalysis';
import EnvironmentalMetrics from './cards/EnvironmentalMetrics';
import PredictionForm from './forms/PredictionForm';
import { useApi } from '../hooks/useApi';
import { getPondStatus, getAllPredictions } from '../services/api';

const Dashboard = ({ pondId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [predictions, setPredictions] = useState([]);

  const { data: pondStatus, loading: statusLoading, refetch: refetchStatus } = 
    useApi(getPondStatus, [pondId]);

  const { data: predictionsData, loading: predictionsLoading, refetch: refetchPredictions } = 
    useApi(getAllPredictions, []);

  useEffect(() => {
    if (predictionsData?.data) {
      const filteredByPond = predictionsData.data.filter(
        p => !p.pond_id || p.pond_id === pondId
      );
      setPredictions(filteredByPond);
    }
  }, [predictionsData, pondId]);

  const handlePredictionSuccess = () => {
    refetchStatus(pondId);
    refetchPredictions();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'history', label: 'History' },
          { id: 'analysis', label: 'Analysis' },
          { id: 'metrics', label: 'Metrics' },
          { id: 'submit', label: 'Submit Data' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-screen">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskScoreCard 
              data={pondStatus?.latest_prediction}
              loading={statusLoading}
              pondId={pondId}
            />
            <div className="grid grid-cols-1 gap-6">
              <EnvironmentalMetrics 
                data={pondStatus?.latest_environment}
                loading={statusLoading}
              />
              {pondStatus?.latest_feeding && (
                <div className="glass-effect card-shadow rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Feeding Data</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Feed Amount:</span>
                      <span className="text-white font-semibold">{pondStatus.latest_feeding.feed_amount?.toFixed(2) || 'N/A'} g</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Feed Response:</span>
                      <span className="text-white font-semibold">{(pondStatus.latest_feeding.feed_response * 100)?.toFixed(1) || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-400">
                      <span>Updated:</span>
                      <span>{pondStatus.latest_feeding.timestamp ? new Date(pondStatus.latest_feeding.timestamp).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <PredictionHistory 
            predictions={predictions}
            loading={predictionsLoading}
          />
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <BehaviorAnalysis 
            behaviors={pondStatus?.recent_behavior_points || []}
            loading={statusLoading}
          />
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="glass-effect card-shadow rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Environmental Metrics</h2>
            {pondStatus?.latest_environment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(pondStatus.latest_environment).map(([key, value]) => (
                  <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-gray-400 text-sm font-medium mb-2">{key.toUpperCase()}</div>
                    <div className="text-white text-2xl font-bold">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">No environmental data available</div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <PredictionForm 
            pondId={pondId}
            onSuccess={handlePredictionSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
