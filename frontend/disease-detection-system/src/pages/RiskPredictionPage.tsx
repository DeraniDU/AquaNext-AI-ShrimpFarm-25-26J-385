import React, { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { predictRisk, RiskPredictionInput } from '../api'
import './Pages.css'

function RiskPredictionPage() {
  const [formData, setFormData] = useState<RiskPredictionInput>({
    activity_mean: 0.18,
    activity_std: 0.02,
    drop_ratio_min: 0.62,
    abnormal_rate: 0.25,
    feed_amount: 120,
    feed_response: 0.55,
    DO: 5.1,
    temp: 30.2,
    pH: 7.6,
    salinity: 15,
    pond_id: 'pond-01',
    timestamp: new Date().toISOString(),
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : Number(value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const data = await predictRisk(formData)
      setResult(data)
    } catch (err) {
      setError('Failed to predict risk. Please check your input and try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <h1>Risk Prediction</h1>

      <div className="grid grid-2">
        {/* Form */}
        <div className="card">
          <h3>Input Parameters</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h4>Behavioral Features</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Activity Mean</label>
                  <input
                    type="number"
                    name="activity_mean"
                    value={formData.activity_mean}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.18"
                  />
                </div>
                <div className="form-group">
                  <label>Activity Std Dev</label>
                  <input
                    type="number"
                    name="activity_std"
                    value={formData.activity_std}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.02"
                  />
                </div>
                <div className="form-group">
                  <label>Drop Ratio Min</label>
                  <input
                    type="number"
                    name="drop_ratio_min"
                    value={formData.drop_ratio_min}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.62"
                  />
                </div>
                <div className="form-group">
                  <label>Abnormal Rate</label>
                  <input
                    type="number"
                    name="abnormal_rate"
                    value={formData.abnormal_rate}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.25"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Feeding Data</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Feed Amount</label>
                  <input
                    type="number"
                    name="feed_amount"
                    value={formData.feed_amount}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="120"
                  />
                </div>
                <div className="form-group">
                  <label>Feed Response</label>
                  <input
                    type="number"
                    name="feed_response"
                    value={formData.feed_response}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.55"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Environmental Data</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Dissolved Oxygen (DO)</label>
                  <input
                    type="number"
                    name="DO"
                    value={formData.DO}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="5.1"
                  />
                </div>
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    name="temp"
                    value={formData.temp}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="30.2"
                  />
                </div>
                <div className="form-group">
                  <label>pH</label>
                  <input
                    type="number"
                    name="pH"
                    value={formData.pH}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="7.6"
                  />
                </div>
                <div className="form-group">
                  <label>Salinity (ppt)</label>
                  <input
                    type="number"
                    name="salinity"
                    value={formData.salinity}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="15"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Metadata</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Pond ID</label>
                  <input
                    type="text"
                    name="pond_id"
                    value={formData.pond_id}
                    onChange={handleInputChange}
                    placeholder="pond-01"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Predicting...' : 'Predict Risk'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="card">
          <h3>Prediction Result</h3>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {result && (
            <div className="result-content">
              <div className="result-item">
                <span>Prediction Status</span>
                <strong style={{ color: '#10b981' }}>
                  <CheckCircle size={16} style={{ display: 'inline' }} /> Success
                </strong>
              </div>

              {result.risk_level && (
                <div className="result-item">
                  <span>Risk Level</span>
                  <span
                    className={`badge badge-${
                      result.risk_level === 'high'
                        ? 'danger'
                        : result.risk_level === 'medium'
                          ? 'warning'
                          : 'success'
                    }`}
                  >
                    {result.risk_level.toUpperCase()}
                  </span>
                </div>
              )}

              {result.confidence !== undefined && (
                <div className="result-item">
                  <span>Confidence</span>
                  <strong>{(result.confidence * 100).toFixed(2)}%</strong>
                </div>
              )}

              {result.saved_to_db && (
                <div className="result-item">
                  <span>Database Status</span>
                  <strong style={{ color: '#10b981' }}>Saved</strong>
                </div>
              )}

              {result.record_id && (
                <div className="result-item">
                  <span>Record ID</span>
                  <code>{result.record_id}</code>
                </div>
              )}

              {result.pond_id && (
                <div className="result-item">
                  <span>Pond ID</span>
                  <strong>{result.pond_id}</strong>
                </div>
              )}

              {result.timestamp && (
                <div className="result-item">
                  <span>Timestamp</span>
                  <small>{new Date(result.timestamp).toLocaleString()}</small>
                </div>
              )}
            </div>
          )}

          {!result && !error && (
            <p className="text-muted">Submit the form to see prediction results</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiskPredictionPage
