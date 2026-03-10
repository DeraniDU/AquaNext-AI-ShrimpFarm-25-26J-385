import { Line } from 'react-chartjs-2'
import type { SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { WaterStatusBadge } from './StatusBadge'
import { useWaterQualityData } from '../lib/useWaterQualityData'
import { useIotSensorData } from '../lib/useIotSensorData'

type Props = {
	ponds: number
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function WaterQualityView({ ponds, history, pondFilter }: Props) {
	// Standard Dashboard API (Mock Data for Ponds that don't have hardware sensors)
	const { data: standardData, loading: standardLoading, error: standardError } = useWaterQualityData({ ponds, autoRefreshMs: 15000 })
	
	// Real-Time Hardware Sensor Data (ESP32)
	const { data: iotHistory, latest: iotLatest, loading: iotLoading } = useIotSensorData({ autoRefreshMs: 5000, limit: 100 })

	if (standardLoading && !standardData && !iotLatest) return <div className="emptyState">Loading water quality data...</div>
	if (standardError && !iotLatest) return <div className="emptyState">Error: {standardError}</div>

	// Fallback to standard data if no IoT data, otherwise mix them
	const standardWater = standardData?.water_quality || []
	let combinedWater = [...standardWater]

	// If we have real hardware data, replace "Pond 1" with it or add it
	if (iotLatest) {
		const hardwarePond = {
			pond_id: 1, // Let's assume the hardware is assigned to Pond 1
			ph: iotLatest.ph || 7.5,
			temperature: iotLatest.temperature || 28.0,
			dissolved_oxygen: iotLatest.do_mg_l || 6.0,
			salinity: iotLatest.salinity || 20.0,
			ammonia: iotLatest.nh3_mg_l || 0.05,
			nitrite: iotLatest.no2_mg_l || 0,
			nitrate: iotLatest.no3_mg_l || 0,
			turbidity: iotLatest.turbidity_ntu || 0,
			status: 'good' as const,
			alerts: [], // we could map from iotLatest if we added that to the api
			isRealTime: true,
			timestamp: iotLatest.timestamp || new Date().toISOString()
		} as any
		
		const existingIndex = combinedWater.findIndex(w => w.pond_id === 1)
		if (existingIndex >= 0) {
			combinedWater[existingIndex] = hardwarePond
		} else {
			combinedWater.unshift(hardwarePond)
		}
	}

	const water = pondFilter ? combinedWater.filter((w) => w.pond_id === pondFilter) : combinedWater
	const historyFiltered = history.map((snap) => ({
		...snap,
		water_quality: pondFilter ? snap.water_quality.filter((w) => w.pond_id === pondFilter) : snap.water_quality
	}))

	const historyLabels = historyFiltered.map((h) => {
		const d = new Date(h.timestamp)
		return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
	})

	const avgPh = water.reduce((sum, w) => sum + w.ph, 0) / water.length || 0
	const avgSalinity = water.reduce((sum, w) => sum + w.salinity, 0) / water.length || 0
	const avgOxygen = water.reduce((sum, w) => sum + w.dissolved_oxygen, 0) / water.length || 0
	const avgTemp = water.reduce((sum, w) => sum + w.temperature, 0) / water.length || 0

	// -------------------------------------------------------------
	// CHART 1: Historical Multi-Parameter
	// -------------------------------------------------------------
	const phHistory = historyFiltered.map((h) => {
		const phs = h.water_quality.map((w) => w.ph)
		return phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : 0
	})
	const doHistory = historyFiltered.map((h) => {
		const dos = h.water_quality.map((w) => w.dissolved_oxygen)
		return dos.length > 0 ? dos.reduce((a, b) => a + b, 0) / dos.length : 0
	})
	const tempHistory = historyFiltered.map((h) => {
		const temps = h.water_quality.map((w) => w.temperature)
		return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0
	})
	const salinityHistory = historyFiltered.map((h) => {
		const sals = h.water_quality.map((w) => w.salinity)
		return sals.length > 0 ? sals.reduce((a, b) => a + b, 0) / sals.length : 0
	})

	const multiParamChart = {
		labels: historyLabels,
		datasets: [
			{
				label: 'pH',
				data: phHistory,
				borderColor: '#22c55e',
				backgroundColor: 'rgba(34, 197, 94, 0.1)',
				yAxisID: 'y',
				tension: 0.4
			},
			{
				label: 'DO (mg/L)',
				data: doHistory,
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.1)',
				yAxisID: 'y1',
				tension: 0.4
			},
			{
				label: 'Temp (°C)',
				data: tempHistory,
				borderColor: '#ef4444',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				yAxisID: 'y2',
				tension: 0.4
			},
			{
				label: 'Salinity (ppt)',
				data: salinityHistory,
				borderColor: '#60a5fa',
				backgroundColor: 'rgba(96, 165, 250, 0.1)',
				yAxisID: 'y3',
				tension: 0.4
			}
		]
	}

	const lineOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: true, position: 'top' as const },
			tooltip: { mode: 'index' as const, intersect: false }
		},
		scales: {
			x: { grid: { display: false } },
			y: {
				type: 'linear' as const,
				display: true,
				position: 'left' as const,
				title: { display: true, text: 'pH' },
				grid: { color: 'rgba(17, 24, 39, 0.08)' }
			},
			y1: {
				type: 'linear' as const,
				display: true,
				position: 'right' as const,
				title: { display: true, text: 'DO (mg/L)' },
				grid: { display: false }
			},
			y2: {
				type: 'linear' as const,
				display: false
			},
			y3: {
				type: 'linear' as const,
				display: false
			}
		}
	}

	// -------------------------------------------------------------
	// CHART 2: DO Real Time ML Prediction (Regression vs Actual)
	// -------------------------------------------------------------
	// We want to graph standard DO vs the ML pediction. The IoT hook gives us `data` list (100 most recent items).
	// We'll reverse it so time goes left-to-right.
	const sortedIot = [...iotHistory].reverse()
	const mlChartLabels = sortedIot.map(d => {
		const dt = new Date(d.timestamp)
		return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	})
	
	const actualDOData = sortedIot.map(d => d.do_mg_l || null)
	const predictedDOData = sortedIot.map((d: any) => d.ml_predictions?.predicted_do_mg_l || null)
	
	const mlPredictionChart = {
		labels: mlChartLabels,
		datasets: [
			{
				label: 'Actual DO (Sensor)',
				data: actualDOData,
				borderColor: '#3b82f6', // blue
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				borderWidth: 2,
				tension: 0.3,
				pointRadius: 2,
			},
			{
				label: 'Predicted DO (Random Forest ML)',
				data: predictedDOData,
				borderColor: '#f59e0b', // amber
				backgroundColor: 'rgba(245, 158, 11, 0.1)',
				borderDash: [5, 5],
				borderWidth: 2,
				tension: 0.3,
				pointRadius: 2,
			}
		]
	}

	const mlChartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		animation: { duration: 0 }, // Disable animation makes real-time look better
		plugins: {
			legend: { display: true, position: 'top' as const },
			tooltip: { mode: 'index' as const, intersect: false },
			title: { display: false }
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { maxTicksLimit: 10 }
			},
			y: {
				type: 'linear' as const,
				display: true,
				position: 'left' as const,
				title: { display: true, text: 'Dissolved Oxygen (mg/L)' },
				grid: { color: 'rgba(17, 24, 39, 0.08)' },
				suggestedMin: 3,
				suggestedMax: 8
			}
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'excellent':
				return 'var(--good)'
			case 'good':
				return 'var(--info)'
			case 'fair':
				return 'var(--warn)'
			case 'poor':
			case 'critical':
				return 'var(--bad)'
			default:
				return 'var(--muted)'
		}
	}

	return (
		<div className="dashGrid">
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Water Quality Overview</div>
					<div className="panelRight">
						{iotLoading && <span className="badge info" style={{ marginRight: 8 }}>Live Syncing...</span>}
						<span className="muted">Updated {latestApiTime(standardData?.timestamp, iotLatest?.timestamp)}</span>
					</div>
				</div>
				<div className="waterCards" style={{ marginBottom: 20 }}>
					<div className="valueCard">
						<div className="valueTitle">pH</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(avgPh, { maximumFractionDigits: 1 })}</span>
						</div>
						<div className={`valueBadge ${avgPh >= 7.5 && avgPh <= 8.5 ? 'good' : 'warn'}`}>
							{avgPh >= 7.5 && avgPh <= 8.5 ? 'Optimal' : 'Check'}
						</div>
					</div>
					<div className="valueCard">
						<div className="valueTitle">Salinity</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(avgSalinity, { maximumFractionDigits: 0 })}</span>
							<span className="valueUnit">ppt</span>
						</div>
						<div className={`valueBadge ${avgSalinity >= 15 && avgSalinity <= 25 ? 'good' : 'warn'}`}>
							{avgSalinity >= 15 && avgSalinity <= 25 ? 'Normal' : 'Caution'}
						</div>
					</div>
					<div className="valueCard">
						<div className="valueTitle">Oxygen</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(avgOxygen, { maximumFractionDigits: 1 })}</span>
							<span className="valueUnit">mg/L</span>
						</div>
						<div className={`valueBadge ${avgOxygen >= 6 ? 'good' : avgOxygen >= 5 ? 'warn' : 'bad'}`}>
							{avgOxygen >= 6 ? 'Good' : avgOxygen >= 5 ? 'Caution' : 'Low'}
						</div>
					</div>
					<div className="valueCard">
						<div className="valueTitle">Temperature</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(avgTemp, { maximumFractionDigits: 1 })}</span>
							<span className="valueUnit">°C</span>
						</div>
						<div className={`valueBadge ${avgTemp >= 26 && avgTemp <= 30 ? 'good' : 'warn'}`}>
							{avgTemp >= 26 && avgTemp <= 30 ? 'Optimal' : 'Check'}
						</div>
					</div>
				</div>
			</div>

			{iotHistory.length > 0 && (
				<div className="panel spanAll" style={{ border: '2px solid rgba(59, 130, 246, 0.5)' }}>
					<div className="panelHeader">
						<div className="panelTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 2s infinite' }}></span>
							Real-Time ML Prediction (DO)
						</div>
						<span className="badge good">Live Sensor Data Mode</span>
					</div>
					<div className="chartBoxLg" style={{ height: 300, padding: 16 }}>
						<Line data={mlPredictionChart as never} options={mlChartOptions} />
					</div>
				</div>
			)}

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Parameter Trends (Daily Average)</div>
				</div>
				<div className="chartBoxLg" style={{ height: 400 }}>
					<Line data={multiParamChart as never} options={lineOptions} />
				</div>
			</div>

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Pond Status</div>
				</div>
				<div style={{ padding: 16 }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
						{water.map((w: any) => (
							<div
								key={w.pond_id}
								style={{
									padding: 16,
									backgroundColor: w.isRealTime ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.5)',
									borderLeft: `4px solid ${getStatusColor(w.status)}`,
									border: w.isRealTime ? '1px solid rgba(59, 130, 246, 0.2)' : undefined,
									borderRadius: 8
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
									<span>Pond {w.pond_id}</span>
									{w.isRealTime && <span className="badge good" style={{ fontSize: '0.65rem' }}>IoT Connected</span>}
								</div>
								<div style={{ marginBottom: 4 }}>
									<WaterStatusBadge status={w.status} />
								</div>
								<div className="muted" style={{ fontSize: '0.875rem', marginTop: 8 }}>
									<div>pH: {formatNumber(w.ph, { maximumFractionDigits: 1 })}</div>
									<div>DO: {formatNumber(w.dissolved_oxygen, { maximumFractionDigits: 1 })} mg/L</div>
									<div>Temp: {formatNumber(w.temperature, { maximumFractionDigits: 1 })}°C</div>
									<div>Salinity: {formatNumber(w.salinity, { maximumFractionDigits: 0 })} ppt</div>
								</div>
								{w.alerts && w.alerts.length > 0 && (
									<div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--bad)' }}>
										{w.alerts.length} alert{w.alerts.length > 1 ? 's' : ''}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
			
			<style>{`
				@keyframes pulse {
					0% { opacity: 1; transform: scale(1); }
					50% { opacity: 0.5; transform: scale(1.5); }
					100% { opacity: 1; transform: scale(1); }
				}
			`}</style>
		</div>
	)
}

function latestApiTime(std?: string, iot?: string) {
	if (!std && !iot) return 'N/A'
	if (!std) return formatDateTime(iot!)
	if (!iot) return formatDateTime(std)
	
	const d1 = new Date(std)
	const d2 = new Date(iot)
	return formatDateTime(d1 > d2 ? std : iot)
}


