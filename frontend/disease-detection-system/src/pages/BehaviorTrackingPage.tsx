import React, { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { pushBehaviorData, BehaviorInput } from '../api'

function BehaviorTrackingPage() {
  const [formData, setFormData] = useState<BehaviorInput>({
    pond_id: 'pond-01',
    timestamp: new Date().toISOString(),
    activity_index: 0.21,
    activity_std: 0.03,
    drop_ratio: 0.82,
    abnormal: 0,
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'pond_id'
          ? value
          : name === 'timestamp'
            ? value
            : Number(value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const data = await pushBehaviorData(formData)
      setResult(data)
      // Reset form
      setFormData({
        pond_id: formData.pond_id,
        timestamp: new Date().toISOString(),
        activity_index: 0.21,
        activity_std: 0.03,
        drop_ratio: 0.82,
        abnormal: 0,
      })
    } catch (err) {
      setError('Failed to record behavior data. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <h1>Behavior Tracking</h1>

      <div className="grid grid-2">
        {/* Form */}
        <div className="card">
          <h3>Record Behavior Data</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Pond ID</label>
              <input
                type="text"
                name="pond_id"
                value={formData.pond_id}
                onChange={handleInputChange}
                placeholder="pond-01"
                required
              />
            </div>

            <div className="form-group">
              <label>Timestamp</label>
              <input
                type="datetime-local"
                name="timestamp"
                value={formData.timestamp.slice(0, 16)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timestamp: new Date(e.target.value).toISOString(),
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Activity Index</label>
              <input
                type="number"
                name="activity_index"
                value={formData.activity_index}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="1"
                placeholder="0.21"
                required
              />
            </div>

            <div className="form-group">
              <label>Activity Std Dev (Optional)</label>
              <input
                type="number"
                name="activity_std"
                value={formData.activity_std || ''}
                onChange={handleInputChange}
                step="0.01"
                placeholder="0.03"
              />
            </div>

            <div className="form-group">
              <label>Drop Ratio (Optional)</label>
              <input
                type="number"
                name="drop_ratio"
                value={formData.drop_ratio || ''}
                onChange={handleInputChange}
                step="0.01"
                placeholder="0.82"
              />
            </div>

            <div className="form-group">
              <label>Abnormal Count (Optional)</label>
              <input
                type="number"
                name="abnormal"
                value={formData.abnormal || ''}
                onChange={handleInputChange}
                step="1"
                min="0"
                placeholder="0"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : 'Record Behavior'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="card">
          <h3>Recording Status</h3>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {result && (
            <div className="result-content">
              <div className="alert alert-success">
                <CheckCircle size={20} />
                {result.message}
              </div>

              <div className="result-item">
                <span>Pond ID</span>
                <strong>{result.pond_id}</strong>
              </div>

              <div className="result-item">
                <span>Stored Points</span>
                <strong>{result.stored_points}</strong>
              </div>

              {result.record_id && (
                <div className="result-item">
                  <span>Record ID</span>
                  <code>{result.record_id}</code>
                </div>
              )}

              <div className="result-item">
                <span>Timestamp</span>
                <small>{new Date(formData.timestamp).toLocaleString()}</small>
              </div>
            </div>
          )}

          {!result && !error && (
            <p className="text-muted">Submit behavior data to see the result</p>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="card mt-4">
        <h3>Activity Index Guidelines</h3>
        <div className="info-list">
          <div className="info-item">
            <span>0.0 - 0.2</span>
            <span>Low Activity (Lethargic/Rest)</span>
          </div>
          <div className="info-item">
            <span>0.2 - 0.5</span>
            <span>Normal Activity</span>
          </div>
          <div className="info-item">
            <span>0.5 - 0.8</span>
            <span>High Activity (Feeding/Active)</span>
          </div>
          <div className="info-item">
            <span>0.8 - 1.0</span>
            <span>Very High Activity (Stressed/Alarmed)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BehaviorTrackingPage
