import { useEffect, useMemo, useState } from 'react'
import { DashboardView } from './components/DashboardView'
import { Sidebar } from './components/Sidebar'
import { ForecastingView } from './components/ForecastingView'
import { HarvestPredictionView } from './components/HarvestPredictionView'
import { OptimizationView } from './components/OptimizationView'
import { LaborOptimizationView } from './components/LaborOptimizationView'
import { WaterQualityView } from './components/WaterQualityView'
import { FeedingView } from './components/FeedingView'
import { DiseaseDetectionView } from './components/DiseaseDetectionView'
import { SettingsView } from './components/SettingsView'
import { BenchmarkingView } from './components/BenchmarkingView'
import { CostManagementView } from './components/CostManagementView'
import { formatDateTime } from './lib/format'
import type { BudgetSettings, DashboardApiResponse, EconomicSettings, SavedFarmSnapshot } from './lib/types'
import { useDashboardData } from './lib/useDashboardData'
import { useHistoryData } from './lib/useHistoryData'
import { useHourlyHistoryData } from './lib/useHourlyHistoryData'
import { useHarvestMlData } from './lib/useHarvestMlData'
import { useWeatherForecastData } from './lib/useWeatherForecastData'

const DEFAULT_ECONOMIC_SETTINGS: EconomicSettings = {
	energy_cost_per_kwh_lkr: 65,
	feed_cost_per_kg_lkr: 400,
	labor_cost_per_hour_lkr: 500,
	shrimp_price_per_kg_lkr: 2000,
	medicine_cost_per_pond_lkr: 0,
	maintenance_cost_per_pond_lkr: 0
}

const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
	weekly_feed_budget_lkr: 75000,
	weekly_energy_budget_lkr: 50000,
	weekly_labor_budget_lkr: 60000,
	cycle_budget_lkr: 750000
}

function loadStoredJson<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback
	try {
		const raw = window.localStorage.getItem(key)
		if (!raw) return fallback
		return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
	} catch {
		return fallback
	}
}

export default function App() {
	const [ponds, setPonds] = useState(4)
	const [selectedPond, setSelectedPond] = useState<'all' | number>('all')
	const [autoRefresh, setAutoRefresh] = useState(false)
	const [activeView, setActiveView] = useState('dashboard')
	const [economicSettings, setEconomicSettings] = useState<EconomicSettings>(() =>
		loadStoredJson('frontend-dashboard-economic-settings', DEFAULT_ECONOMIC_SETTINGS)
	)
	const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(() =>
		loadStoredJson('frontend-dashboard-budget-settings', DEFAULT_BUDGET_SETTINGS)
	)

	useEffect(() => {
		window.localStorage.setItem('frontend-dashboard-economic-settings', JSON.stringify(economicSettings))
	}, [economicSettings])

	useEffect(() => {
		window.localStorage.setItem('frontend-dashboard-budget-settings', JSON.stringify(budgetSettings))
	}, [budgetSettings])

	const { data, loading, error, lastUpdatedAt, refresh } = useDashboardData({
		ponds,
		autoRefreshMs: autoRefresh ? 15_000 : null,
		economicSettings,
		budgetSettings
	})
	const { data: historyData, loading: historyLoading, error: historyError, refresh: refreshHistory } = useHistoryData({
		days: 7
	})
	const { data: hourlyHistoryData, loading: hourlyHistoryLoading, error: hourlyHistoryError, refresh: refreshHourlyHistory } = useHourlyHistoryData({
		hours: 24
	})

	const harvestMl = useHarvestMlData({
		ponds: data?.water_quality?.length ?? ponds,
		horizonDays: 90,
		enabled: Boolean(data)
	})
	const weatherForecast = useWeatherForecastData({
		enabled: Boolean(data),
		hours: 48,
		days: 3
	})

	const pondIds = useMemo(() => {
		if (!data) return []
		return Array.from(new Set(data.water_quality.map((w) => w.pond_id))).sort((a, b) => a - b)
	}, [data])

	useEffect(() => {
		if (selectedPond !== 'all' && pondIds.length && !pondIds.includes(selectedPond)) setSelectedPond('all')
	}, [pondIds, selectedPond])

	const connection = error ? 'bad' : loading ? 'info' : data ? 'good' : 'warn'
	const connectionLabel = error ? 'API error' : loading ? 'Loading…' : data ? 'Connected' : 'Waiting'
	const subtitle = data?.dashboard?.timestamp ? `Snapshot: ${formatDateTime(data.dashboard.timestamp)}` : 'API: /api/dashboard'

	const renderView = () => {
		const historyWithLive = data ? mergeHistoryWithLiveSnapshot(historyData?.items ?? [], data) : (historyData?.items ?? [])
		// Water quality: embed water-quality-system app (runs on port 5175)
		if (activeView === 'water-quality') {
			return (
				<div style={{ width: '100%', height: '100vh', border: 'none' }}>
					<iframe
						src="http://localhost:5175"
						title="Water Quality"
						style={{ width: '100%', height: '100%', border: 'none' }}
					/>
				</div>
			)
		}
		// Feeding: embed feeding-system app (runs on port 5174)
		if (activeView === 'feeding') {
			return (
				<div style={{ width: '100%', height: '100vh', border: 'none' }}>
					<iframe
						src="http://localhost:5174"
						title="Feeding System"
						style={{ width: '100%', height: '100%', border: 'none' }}
					/>
				</div>
			)
		}

		if (!data) {
			return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
		}

		const viewProps = data ? {
			data: data as DashboardApiResponse,
			history: historyWithLive,
			hourlyHistory: hourlyHistoryData?.items ?? [],
			pondFilter: selectedPond === 'all' ? null : selectedPond
		} : null

		switch (activeView) {
			case 'dashboard':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <DashboardView {...viewProps} weatherForecast={weatherForecast} onOpenForecasting={() => setActiveView('forecasting')} />
			case 'forecasting':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <ForecastingView {...viewProps} harvestMl={harvestMl} />
			case 'harvest-prediction':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <HarvestPredictionView data={viewProps.data} harvestMl={harvestMl} />

			case 'optimization':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
			return <OptimizationView data={viewProps.data} history={viewProps.history} pondFilter={viewProps.pondFilter} ponds={ponds} />
			case 'labor-optimization':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <LaborOptimizationView data={viewProps.data} history={viewProps.history} pondFilter={viewProps.pondFilter} ponds={ponds} />
			case 'benchmarking':
				return <BenchmarkingView ponds={ponds} />
			case 'cost-management':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return (
					<CostManagementView
						data={viewProps.data}
						pondFilter={viewProps.pondFilter}
						onOpenSettings={() => setActiveView('settings')}
					/>
				)
			case 'water-quality':
				// Rendered via iframe above when water-quality is selected
				return null
			case 'feeding':
				return <FeedingView ponds={ponds} pondFilter={selectedPond === 'all' ? null : selectedPond} history={historyData?.items ?? []} />

			case 'disease-detection':
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <DiseaseDetectionView {...viewProps} />
			case 'settings':
				return (
					<SettingsView
						ponds={ponds}
						onPondsChange={setPonds}
						autoRefresh={autoRefresh}
						onAutoRefreshChange={setAutoRefresh}
						economicSettings={economicSettings}
						budgetSettings={budgetSettings}
						onEconomicSettingsChange={setEconomicSettings}
						onBudgetSettingsChange={setBudgetSettings}
					/>
				)
			default:
				if (!viewProps) return <div className="emptyState">{loading ? 'Loading dashboard…' : 'Click Refresh to load data.'}</div>
				return <DashboardView {...viewProps} weatherForecast={weatherForecast} onOpenForecasting={() => setActiveView('forecasting')} />
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
									void refreshHourlyHistory()
									void harvestMl.refresh()
									void weatherForecast.refresh()
								}}
								disabled={loading || historyLoading || hourlyHistoryLoading}
							>
								{loading || historyLoading || hourlyHistoryLoading ? 'Refreshing…' : 'Refresh'}
							</button>
						</div>
					</div>
				</div>

				<div className="container">
					{activeView !== 'feeding' && activeView !== 'water-quality' && error && (
						<div className="card">
							<div className="cardInner">
								<div className="cardHeader">
									<h2>Couldn't load dashboard</h2>
									<span className="badge bad">API</span>
								</div>
								<div className="muted">
									{error}. For full stack (Dashboard + Feeding) use all 5 terminals from{' '}
									<span className="mono">FEEDING_TAB_SETUP.md</span> (AI Assistant on 8001, Gateway on 8000).
								</div>
							</div>
						</div>
					)}
					{activeView !== 'feeding' && activeView !== 'water-quality' && historyError && (
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

function mergeHistoryWithLiveSnapshot(history: SavedFarmSnapshot[], data: DashboardApiResponse): SavedFarmSnapshot[] {
	const live: SavedFarmSnapshot = {
		source: 'live',
		timestamp: data.dashboard.timestamp,
		water_quality: data.water_quality.map((w) => ({
			pond_id: w.pond_id,
			ph: w.ph,
			temperature: w.temperature,
			dissolved_oxygen: w.dissolved_oxygen,
			salinity: w.salinity,
			status: w.status,
			alerts: w.alerts ?? []
		})),
		feed: data.feed.map((f) => ({
			pond_id: f.pond_id,
			shrimp_count: f.shrimp_count,
			average_weight: f.average_weight,
			feed_amount: f.feed_amount,
			feed_type: f.feed_type,
			feeding_frequency: f.feeding_frequency
		})),
		energy: data.energy.map((e) => ({
			pond_id: e.pond_id,
			total_energy: e.total_energy,
			cost: e.cost,
			efficiency_score: e.efficiency_score
		})),
		labor: data.labor.map((l) => ({
			pond_id: l.pond_id,
			tasks_completed: l.tasks_completed ?? [],
			time_spent: l.time_spent,
			worker_count: l.worker_count,
			efficiency_score: l.efficiency_score
		}))
	}

	const combined = [...history, live].filter((s) => Boolean(s?.timestamp))

	// Dedupe per-day (YYYY-MM-DD) keeping the latest timestamp for that day.
	const byDay = new Map<string, SavedFarmSnapshot>()
	for (const snap of combined) {
		const dayKey = String(snap.timestamp).slice(0, 10)
		const existing = byDay.get(dayKey)
		if (!existing) {
			byDay.set(dayKey, snap)
			continue
		}
		const a = new Date(existing.timestamp).getTime()
		const b = new Date(snap.timestamp).getTime()
		if (!Number.isNaN(b) && (Number.isNaN(a) || b > a)) byDay.set(dayKey, snap)
	}

	return Array.from(byDay.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}