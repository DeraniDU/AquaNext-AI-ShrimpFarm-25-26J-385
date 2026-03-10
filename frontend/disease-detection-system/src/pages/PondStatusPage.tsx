import React, { useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import { getPondStatus } from '../api'

function PondStatusPage() {
  const [pondId, setPondId] = useState('pond-01')
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetchStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const data = await getPondStatus(pondId)
      setStatus(data)
    } catch (err) {
      setError('Failed to fetch pond status. Please try again.')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const renderDataItem = (label: string, value: any) => {
    if (!value) return null
    return (
      <div className="data-item">
        <span>{label}:</span>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="page-content">
      <h1>Pond Status Monitor</h1>

      {/* Pond Selection */}
      <div className="card">
        <h3>Select Pond</h3>
        <form onSubmit={handleFetchStatus} className="form-inline">
          <div className="form-group" style={{ flex: 1, marginRight: '1rem' }}>
            <input
              type="text"
              value={pondId}
              onChange={(e) => setPondId(e.target.value)}
              placeholder="Enter pond ID"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} /> Loading...
              </>
            ) : (
              'Get Status'
            )}
          </button>
        </form>
      </div>

      {/* Status Display */}
      {error && (
        <div className="card mt-2">
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      )}

      {status && (
        <div className="grid grid-2 mt-4">
          {/* Latest Data */}
          <div className="card">
            <h3>Latest Readings</h3>
            {renderDataItem('Behavior', status.latest_behavior)}
            {renderDataItem('Feeding', status.latest_feeding)}
            {renderDataItem('Environment', status.latest_environment)}
          </div>

          {/* Latest Prediction */}
          <div className="card">
            <h3>Latest Prediction</h3>
            {status.latest_prediction ? (
              <div className="result-content">
                {status.latest_prediction.risk_level && (
                  <div className="result-item">
                    <span>Risk Level</span>
                    <span
                      className={`badge badge-${
                        status.latest_prediction.risk_level === 'high'
                          ? 'danger'
                          : status.latest_prediction.risk_level === 'medium'
                            ? 'warning'
                            : 'success'
                      }`}
                    >
                      {status.latest_prediction.risk_level.toUpperCase()}
                    </span>
                  </div>
                )}
                {status.latest_prediction.confidence !== undefined && (
                  <div className="result-item">
                    <span>Confidence</span>
                    <strong>{(status.latest_prediction.confidence * 100).toFixed(2)}%</strong>
                  </div>
                )}
                {status.latest_prediction.timestamp && (
                  <div className="result-item">
                    <span>Prediction Time</span>
                    <small>
                      {new Date(status.latest_prediction.timestamp).toLocaleString()}
                    </small>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">No predictions available</p>
            )}
          </div>

          {/* Recent Behavior Points */}
          <div className="card">
            <h3>Recent Behavior ({status.recent_behavior_points?.length || 0} points)</h3>
            {status.recent_behavior_points && status.recent_behavior_points.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Activity Index</th>
                      <th>Drop Ratio</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.recent_behavior_points.slice(0, 10).map((point: any, idx: number) => (
                      <tr key={idx}>
                        <td>{point.activity_index?.toFixed(3)}</td>
                        <td>{point.drop_ratio?.toFixed(3)}</td>
                        <td>{new Date(point.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No behavior data</p>
            )}
          </div>

          {/* Summary */}
          <div className="card">
            <h3>Pond Summary</h3>
            <div className="info-list">
              <div className="info-item">
                <span>Pond ID:</span>
                <strong>{status.pond_id}</strong>
              </div>
              <div className="info-item">
                <span>Total Behavior Points:</span>
                <strong>{status.recent_behavior_points?.length || 0}</strong>
              </div>
              <div className="info-item">
                <span>Has Environment Data:</span>
                <strong>{status.latest_environment ? 'Yes' : 'No'}</strong>
              </div>
              <div className="info-item">
                <span>Has Prediction:</span>
                <strong>{status.latest_prediction ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {!status && !error && (
        <div className="card mt-4">
          <p className="text-muted text-center">Select a pond and click "Get Status" to view detailed information</p>
        </div>
      )}
    </div>
  )
}

export default PondStatusPage
