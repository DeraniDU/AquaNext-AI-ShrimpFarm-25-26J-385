import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getPredictions, getPredictionsByPond } from '../api'

function PredictionsHistoryPage() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [filteredPredictions, setFilteredPredictions] = useState<any[]>([])
  const [selectedPond, setSelectedPond] = useState<string | null>(null)
  const [, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllPredictions()
  }, [])

  const fetchAllPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPredictions(100)
      setPredictions(data)
      setFilteredPredictions(data)
      setSelectedPond(null)
    } catch (err) {
      setError('Failed to fetch predictions')
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }

  const handlePondFilter = async (pondId: string) => {
    if (pondId === selectedPond) {
      // Deselect filter
      setSelectedPond(null)
      setFilteredPredictions(predictions)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getPredictionsByPond(pondId, 100)
      setFilteredPredictions(data)
      setSelectedPond(pondId)
    } catch (err) {
      setError(`Failed to fetch predictions for pond ${pondId}`)
    } finally {
      setLoading(false)
    }
  }

  const uniquePonds = Array.from(
    new Set(predictions.map((p) => p.pond_id).filter(Boolean))
  ) as string[]

  const riskDistribution = filteredPredictions.reduce(
    (acc, pred) => {
      const risk = pred.risk_level || 'unknown'
      acc[risk] = (acc[risk] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const riskChartData = Object.entries(riskDistribution).map(([level, count]) => ({
    name: level,
    value: count,
  }))

  const COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
    unknown: '#6b7280',
  }

  const confidenceData = filteredPredictions
    .filter((p) => p.confidence !== undefined)
    .slice(-20)
    .map((p, idx) => ({
      index: idx,
      confidence: p.confidence,
      pond: p.pond_id || 'Unknown',
    }))

  return (
    <div className="page-content">
      <h1>Prediction History</h1>

      {error && (
        <div className="card mb-2">
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-3">
        <div className="card stat-card">
          <div className="stat-header">
            <TrendingUp size={24} color="#3b82f6" />
            <h3>Total Predictions</h3>
          </div>
          <p className="stat-value">{predictions.length}</p>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <AlertCircle size={24} color="#ef4444" />
            <h3>High Risk</h3>
          </div>
          <p className="stat-value">{riskDistribution['high'] || 0}</p>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <TrendingUp size={24} color="#10b981" />
            <h3>Low Risk</h3>
          </div>
          <p className="stat-value">{riskDistribution['low'] || 0}</p>
        </div>
      </div>

      {/* Pond Filter */}
      <div className="card mt-4">
        <h3>Filter by Pond</h3>
        <div className="pond-filter">
          <button
            onClick={fetchAllPredictions}
            className={`btn ${selectedPond === null ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Ponds
          </button>
          {uniquePonds.map((pond) => (
            <button
              key={pond}
              onClick={() => handlePondFilter(pond)}
              className={`btn ${selectedPond === pond ? 'btn-primary' : 'btn-secondary'}`}
            >
              {pond}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-2 mt-4">
        <div className="card">
          <h3>Risk Distribution</h3>
          {riskChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskChartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted">No data available</p>
          )}
        </div>

        <div className="card">
          <h3>Confidence Trend</h3>
          {confidenceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="pond" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="confidence" stroke="#3b82f6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted">No data available</p>
          )}
        </div>
      </div>

      {/* Predictions Table */}
      <div className="card mt-4">
        <h3>
          Predictions ({filteredPredictions.length})
          {selectedPond && ` - ${selectedPond}`}
        </h3>
        {filteredPredictions.length > 0 ? (
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
                {filteredPredictions.slice(0, 50).map((pred, idx) => (
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
                    <td>{((pred.confidence || 0) * 100).toFixed(1)}%</td>
                    <td>{new Date(pred.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">No predictions available</p>
        )}
      </div>
    </div>
  )
}

export default PredictionsHistoryPage
