import { Line } from 'react-chartjs-2'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { WaterStatusBadge } from './StatusBadge'

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function WaterQualityView({ data, history, pondFilter }: Props) {
	const { dashboard } = data
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality

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
						<span className="muted">Updated {formatDateTime(dashboard.timestamp)}</span>
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

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Parameter Trends</div>
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
						{water.map((w) => (
							<div
								key={w.pond_id}
								style={{
									padding: 16,
									backgroundColor: 'rgba(255, 255, 255, 0.5)',
									borderLeft: `4px solid ${getStatusColor(w.status)}`,
									borderRadius: 8
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: 8 }}>Pond {w.pond_id}</div>
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
		</div>
	)
}

