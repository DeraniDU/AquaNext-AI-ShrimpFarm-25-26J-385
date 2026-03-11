import React, { useState } from 'react';
import { Send, Loader } from 'lucide-react';
import { predictRisk } from '../../services/api';

const PredictionForm = ({ pondId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    activity_mean: 0.18,
    activity_std: 0.02,
    drop_ratio_min: 0.62,
    abnormal_rate: 0.25,
    feed_amount: 120.0,
    feed_response: 0.55,
    DO: 5.1,
    temp: 30.2,
    pH: 7.6,
    salinity: 15.0,
    pond_id: pondId,
    timestamp: new Date().toISOString(),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'pond_id' ? value : parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await predictRisk(formData);
      setSuccess(true);
      setFormData({
        activity_mean: 0.18,
        activity_std: 0.02,
        drop_ratio_min: 0.62,
        abnormal_rate: 0.25,
        feed_amount: 120.0,
        feed_response: 0.55,
        DO: 5.1,
        temp: 30.2,
        pH: 7.6,
        salinity: 15.0,
        pond_id: pondId,
        timestamp: new Date().toISOString(),
      });
      
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err.detail || 'Failed to submit prediction');
    } finally {
      setLoading(false);
    }
  };

  const fieldGroups = [
    {
      title: 'Behavioral Metrics',
      fields: [
        { name: 'activity_mean', label: 'Activity Mean', step: 0.01 },
        { name: 'activity_std', label: 'Activity Std Dev', step: 0.01 },
        { name: 'drop_ratio_min', label: 'Drop Ratio Min', step: 0.01 },
        { name: 'abnormal_rate', label: 'Abnormal Rate', step: 0.01 },
      ]
    },
    {
      title: 'Feeding Data',
      fields: [
        { name: 'feed_amount', label: 'Feed Amount (g)', step: 1 },
        { name: 'feed_response', label: 'Feed Response (0-1)', step: 0.01 },
      ]
    },
    {
      title: 'Environmental Metrics',
      fields: [
        { name: 'DO', label: 'Dissolved Oxygen (mg/L)', step: 0.1 },
        { name: 'temp', label: 'Temperature (°C)', step: 0.1 },
        { name: 'pH', label: 'pH Level', step: 0.1 },
        { name: 'salinity', label: 'Salinity (ppt)', step: 0.1 },
      ]
    }
  ];

  return (
    <div className="glass-effect card-shadow rounded-xl p-8">
      <h2 className="text-2xl font-bold text-white mb-8">Submit Prediction Data</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3 text-green-300">
          <span>✓</span>
          <p>Prediction submitted successfully! The risk score has been calculated.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-300">
          <span>✕</span>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Pond ID */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Pond ID</label>
          <input
            type="text"
            name="pond_id"
            value={formData.pond_id}
            onChange={handleChange}
            disabled
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white cursor-not-allowed opacity-60"
          />
        </div>

        {/* Field Groups */}
        {fieldGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-600 rounded"></div>
              {group.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    step={field.step}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    placeholder="Enter value"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Timestamp */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Timestamp</label>
          <input
            type="text"
            value={new Date().toLocaleString()}
            disabled
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-400 cursor-not-allowed opacity-60"
          />
          <p className="text-xs text-gray-400 mt-1">Automatically set to current time</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 card-shadow"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Prediction
            </>
          )}
        </button>
      </form>

      {/* Info Panel */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">💡 Data Entry Tips</h4>
        <ul className="text-xs text-blue-200/80 space-y-1">
          <li>• Behavioral metrics help detect abnormal shrimp activities</li>
          <li>• Feeding data indicates the health and stress levels of shrimp</li>
          <li>• Environmental metrics are critical indicators for disease risk</li>
          <li>• All fields should be within realistic ranges for accurate predictions</li>
        </ul>
      </div>
    </div>
  );
};

export default PredictionForm;
