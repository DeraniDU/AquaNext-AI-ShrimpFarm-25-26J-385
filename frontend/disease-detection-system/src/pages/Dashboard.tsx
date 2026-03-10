import { useState, useEffect } from 'react'
import { AlertCircle, BarChart3, Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getPredictions } from '../api'

function Dashboard() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentPredictions()
  }, [])

  const fetchRecentPredictions = async () => {
    try {
      setLoading(true)
      const data = await getPredictions(20)
      setPredictions(data)
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const riskLevels = predictions.reduce(
    (acc, pred) => {
      const risk = pred.risk_level || 'unknown'
      acc[risk] = (acc[risk] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const chartData = Object.entries(riskLevels).map(([level, count]) => ({
    name: level,
    count,
  }))

  return (
    <div className="page-content">
      <h1>Disease Detection Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-3">
        <div className="card stat-card">
          <div className="stat-header">
            <BarChart3 size={24} color="#3b82f6" />
            <h3>Total Predictions</h3>
          </div>
          <p className="stat-value">{predictions.length}</p>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <AlertCircle size={24} color="#ef4444" />
            <h3>High Risk</h3>
          </div>
          <p className="stat-value">{riskLevels['high'] || 0}</p>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <Zap size={24} color="#10b981" />
            <h3>Low Risk</h3>
          </div>
          <p className="stat-value">{riskLevels['low'] || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-2 mt-4">
        <div className="card">
          <h3>Risk Distribution</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted">No data available</p>
          )}
        </div>

        <div className="card">
          <h3>System Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span>Module:</span>
              <strong>disease-detection</strong>
            </div>
            <div className="info-item">
              <span>API Status:</span>
              <strong style={{ color: '#10b981' }}>Connected</strong>
            </div>
            <div className="info-item">
              <span>Database:</span>
              <strong>shrimp_farm_iot</strong>
            </div>
            <div className="info-item">
              <span>Recent Predictions:</span>
              <strong>{predictions.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="card mt-4">
        <h3>Recent Predictions</h3>
        {predictions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pond ID</th>
                  <th>Risk Level</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 10).map((pred, idx) => (
                  <tr key={idx}>
                    <td>{pred.pond_id || 'N/A'}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          pred.risk_level === 'high'
                            ? 'danger'
                            : pred.risk_level === 'medium'
                              ? 'warning'
                              : 'success'
                        }`}
                      >
                        {pred.risk_level || 'Unknown'}
                      </span>
                    </td>
                    <td>{(pred.confidence * 100).toFixed(1)}%</td>
                    <td>{pred.timestamp || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">No predictions yet</p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
