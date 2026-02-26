import { useEffect, useMemo, useState } from 'react'
import { DashboardView } from './components/DashboardView'
import { Sidebar } from './components/Sidebar'
import { ForecastingView } from './components/ForecastingView'
import { OptimizationView } from './components/OptimizationView'
import { WaterQualityView } from './components/WaterQualityView'
import { FeedingView } from './components/FeedingView'
import { DiseaseDetectionView } from './components/DiseaseDetectionView'
import { SettingsView } from './components/SettingsView'
import { formatDateTime } from './lib/format'
import type { DashboardApiResponse } from './lib/types'
import { useDashboardData } from './lib/useDashboardData'
import { useHistoryData } from './lib/useHistoryData'

export default function App() {
	const [ponds, setPonds] = useState(4)
	const [selectedPond, setSelectedPond] = useState<'all' | number>('all')
	const [autoRefresh, setAutoRefresh] = useState(false)
	const [activeView, setActiveView] = useState('dashboard')

	const { data, loading, error, lastUpdatedAt, refresh } = useDashboardData({
		ponds,
		autoRefreshMs: autoRefresh ? 15_000 : null
	})
	const { data: historyData, loading: historyLoading, error: historyError, refresh: refreshHistory } = useHistoryData({
		days: 7
	})

	const pondIds = useMemo(() => {
		if (!data) return []
		return Array.from(new Set(data.water_quality.map((w) => w.pond_id))).sort((a, b) => a - b)
	}, [data])

	useEffect(() => {
		if (selectedPond !== 'all' && pondIds.length && !pondIds.includes(selectedPond)) setSelectedPond('all')
	}, [pondIds, selectedPond])

	const connection = error ? 'bad' : loading ? 'info' : data ? 'good' : 'warn'
	const connectionLabel = error ? 'Error' : loading ? 'Loading…' : data ? 'Ready' : 'Waiting'
	const subtitle = data?.dashboard?.timestamp ? `Snapshot: ${formatDateTime(data.dashboard.timestamp)}` : 'Using mock data'

	const renderView = () => {
		if (!data) {
			return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
		}

		const viewProps = {
			data: data as DashboardApiResponse,
			history: historyData?.items ?? [],
			pondFilter: selectedPond === 'all' ? null : selectedPond
		}

		switch (activeView) {
			case 'dashboard':
				return <DashboardView {...viewProps} />
			case 'forecasting':
				return <ForecastingView {...viewProps} />
			case 'optimization':
				return <OptimizationView {...viewProps} />
			case 'water-quality':
				return <WaterQualityView {...viewProps} />
			case 'feeding':
				return <FeedingView {...viewProps} />
			case 'disease-detection':
				return <DiseaseDetectionView {...viewProps} />
			case 'settings':
				return (
					<SettingsView
						ponds={ponds}
						onPondsChange={setPonds}
						autoRefresh={autoRefresh}
						onAutoRefreshChange={setAutoRefresh}
					/>
				)
			default:
				return <DashboardView {...viewProps} />
		}
	}

	return (
		<div className="app">
			<Sidebar activeView={activeView} onViewChange={setActiveView} />
			<div className="mainContent">
				<div className="topbar">
					<div className="topbarInner">
						<div className="brand">
							<div className="brandMark" aria-hidden="true" />
							<div className="brandTitle">
								<h1>AI Agentic Shrimp Farm Management Dashboard</h1>
								<div className="subtitle">{subtitle}</div>
							</div>
						</div>

						<div className="controls">
							<span className="pill" title={error ?? undefined}>
								<span className={`dot ${connection}`} />
								{connectionLabel}
								{lastUpdatedAt ? ` · Updated ${formatDateTime(lastUpdatedAt)}` : ''}
							</span>

							{activeView !== 'settings' && (
								<>
									<div className="controlGroup" title="How many ponds to request from the API">
										<span className="label">Ponds</span>
										<select value={ponds} onChange={(e) => setPonds(Number(e.target.value))}>
											{[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
												<option key={n} value={n}>
													{n}
												</option>
											))}
										</select>
									</div>

									<div className="controlGroup" title="Filter visualizations to a specific pond">
										<span className="label">View</span>
										<select
											value={selectedPond === 'all' ? 'all' : String(selectedPond)}
											onChange={(e) => {
												const v = e.target.value
												setSelectedPond(v === 'all' ? 'all' : Number(v))
											}}
											disabled={!pondIds.length}
										>
											<option value="all">All ponds</option>
											{pondIds.map((id) => (
												<option key={id} value={id}>
													Pond {id}
												</option>
											))}
										</select>
									</div>

									<div className="controlGroup">
										<span className="label">Auto</span>
										<label className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
											<input
												type="checkbox"
												checked={autoRefresh}
												onChange={(e) => setAutoRefresh(e.target.checked)}
											/>
											15s
										</label>
									</div>
								</>
							)}

							<button
								onClick={() => {
									void refresh()
									void refreshHistory()
								}}
								disabled={loading || historyLoading}
							>
								{loading || historyLoading ? 'Refreshing…' : 'Refresh'}
							</button>
						</div>
					</div>
				</div>

				<div className="container">
					{error && (
						<div className="card">
							<div className="cardInner">
								<div className="cardHeader">
									<h2>Couldn't load dashboard</h2>
									<span className="badge bad">ERROR</span>
								</div>
								<div className="muted">
									{error}. Please refresh the page or check the console for details.
								</div>
							</div>
						</div>
					)}
					{historyError && (
						<div className="card">
							<div className="cardInner">
								<div className="cardHeader">
									<h2>Couldn't load history</h2>
									<span className="badge warn">HISTORY</span>
								</div>
								<div className="muted">
									{historyError}. The dashboard will still work, but trend charts may be limited.
								</div>
							</div>
						</div>
					)}

					{renderView()}
				</div>
			</div>
		</div>
	)
}


