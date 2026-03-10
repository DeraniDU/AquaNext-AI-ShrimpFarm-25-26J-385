import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { checkHealth, HealthResponse } from '../api'
import './HealthStatus.css'

function HealthStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const data = await checkHealth()
      setHealth(data)
      setError(null)
    } catch (err) {
      setError('Failed to connect to backend')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="health-status-container">
      <div className="health-status-badge">
        {loading && <Loader className="spinner-icon" size={16} />}
        {!loading && health?.ok && <CheckCircle size={16} color="#10b981" />}
        {!loading && error && <AlertCircle size={16} color="#ef4444" />}
        <span className="health-text">
          {health ? `${health.service} (${health.env})` : 'Checking...'}
        </span>
        <button
          onClick={fetchHealth}
          className="health-refresh-btn"
          title="Refresh health status"
        >
          ↻
        </button>
      </div>
    </div>
  )
}

export default HealthStatus
