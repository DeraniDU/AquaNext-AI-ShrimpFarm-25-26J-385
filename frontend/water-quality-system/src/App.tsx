import React from 'react'
import { WaterQualityView } from './components/WaterQualityView'
import { IoTLivePanel } from './components/IoTLivePanel'
import type { DashboardApiResponse } from './lib/types'
import { useDashboardData } from './lib/useDashboardData'
import { useHistoryData } from './lib/useHistoryData'

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches any JS error in the component tree and shows a message instead of
// a blank page.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; label?: string }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ padding: 16, margin: '8px 0', borderColor: 'var(--bad)', background: 'rgba(220,38,38,0.06)', color: 'var(--bad)', fontSize: '0.82rem' }}>
          <strong>{this.props.label ?? 'Error'}</strong>: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
	const ponds = 4

	// data is null when offline
	const { data, error } = useDashboardData({ ponds, autoRefreshMs: 5_000 })
	const { data: historyData } = useHistoryData({ days: 7 })

	const extraIot = data ? (data as any).extraIot ?? {} : {}

	return (
		<div style={{ width: '100%', minHeight: '100vh', padding: 20 }}>
			<ErrorBoundary label="IoT Panel Error">
				<IoTLivePanel extraIot={extraIot} error={error} />
			</ErrorBoundary>

			{data ? (
				<ErrorBoundary label="Dashboard Error">
					<WaterQualityView
						data={data as DashboardApiResponse}
						history={historyData?.items ?? []}
						pondFilter={null}
					/>
				</ErrorBoundary>
			) : (
				<div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', filter: 'grayscale(1)', opacity: 0.5 }}>
					<h2>Waiting for Sensor Data...</h2>
					<p>Start the IoT Gateway (app.py) and send data from the ESP32/Arduino sensor node.</p>
				</div>
			)}
		</div>
	)
}
