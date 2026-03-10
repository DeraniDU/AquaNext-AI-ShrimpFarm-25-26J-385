import { Line } from 'react-chartjs-2'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { WaterStatusBadge } from './StatusBadge'
import { AIPredictionsPanel } from './AIPredictionsPanel'
import { AutoTriggerPanel } from './AutoTriggerPanel'
import { useAutoTrigger } from '../lib/useAutoTrigger'
import { WaterQualitySimulator } from './WaterQualitySimulator'
import { ExtraIotFields, fmt, Row, alertBorderColor, alertBg } from './IoTLivePanel'

type Props = {
	extraIot?: ExtraIotFields
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function WaterQualityView({ data, history, pondFilter, extraIot }: Props) {
	const { dashboard } = data
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality

	// Initialize auto-trigger system with water quality data
	const autoTrigger = useAutoTrigger(water)

	const historyFiltered = history.map((snap) => ({
		...snap,
		water_quality: pondFilter ? snap.water_quality.filter((w) => w.pond_id === pondFilter) : snap.water_quality
	}))

	const historyLabels = historyFiltered.map((h) => {
		const d = new Date(h.timestamp)
		return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
	})

	const avgOxygen = water.reduce((sum, w) => sum + w.dissolved_oxygen, 0) / water.length || 0
	
	const nh3 = extraIot?.nh3_mg_l ?? extraIot?.physics_calculations?.nh3?.nh3_mg_l ?? 0
	const tan = extraIot?.tan_mg_l ?? 0
	const turbidity = extraIot?.turbidity_ntu ?? 0

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
						<div className="valueTitle">TAN</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(tan, { maximumFractionDigits: 2 })}</span>
							<span className="valueUnit">mg/L</span>
						</div>
						<div className={`valueBadge ${tan <= 0.5 ? 'good' : 'bad'}`}>
							{tan <= 0.5 ? 'Optimal' : 'High'}
						</div>
					</div>
					<div className="valueCard">
						<div className="valueTitle">NH₃ (Toxic Ammonia)</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(nh3, { maximumFractionDigits: 3 })}</span>
							<span className="valueUnit">mg/L</span>
						</div>
						<div className={`valueBadge ${nh3 <= 0.1 ? 'good' : 'bad'}`}>
							{nh3 <= 0.1 ? 'Safe' : 'Alert'}
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
						<div className="valueTitle">Turbidity</div>
						<div className="valueMain">
							<span className="valueNumber mono">{formatNumber(turbidity, { maximumFractionDigits: 1 })}</span>
							<span className="valueUnit">NTU</span>
						</div>
						<div className={`valueBadge ${turbidity <= 30 ? 'good' : 'warn'}`}>
							{turbidity <= 30 ? 'Clear' : 'Check'}
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

			{/* Secondary Parameters and System Alerts (Real-Time IoT) */}
			{extraIot && (
				<div className="panel spanAll">
					<div className="panelHeader" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 16 }}>
						<div className="panelTitle">Real-Time Detailed Parameters & Alerts</div>
					</div>
					<div style={{ padding: '24px 16px' }}>
						<div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) minmax(300px, 1fr)', gap: 24 }}>
							
							{/* Other Sensors Grid */}
							<div>
								<h2 style={{ fontSize: '1.05rem', color: '#374151', marginBottom: 12 }}>
									Secondary Parameters
								</h2>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
									<div className="panel" style={{ padding: '0 12px' }}>
										<Row label="ORP" value={fmt(extraIot.orp_mv, 0)} unit="mV" badge={extraIot.orp_mv != null ? <span className={(extraIot.orp_mv ?? 0) >= 200 && (extraIot.orp_mv ?? 0) <= 400 ? 'badge good' : 'badge warn'}>{(extraIot.orp_mv ?? 0) >= 200 && (extraIot.orp_mv ?? 0) <= 400 ? 'OK' : 'Check'}</span> : undefined} />
										<Row label="Alkalinity" value={fmt(extraIot.alkalinity, 0)} unit="mg/L" badge={extraIot.alkalinity != null ? <span className={(extraIot.alkalinity ?? 0) >= 100 && (extraIot.alkalinity ?? 0) <= 200 ? 'badge good' : 'badge warn'}>OK</span> : undefined} />
										<Row label="Conductivity" value={fmt(extraIot.conductivity, 0)} unit="µS/cm" />
										<Row label="Nitrate NO₃" value={fmt(extraIot.no3_mg_l, 1)} unit="mg/L" />
									</div>
									<div className="panel" style={{ padding: '0 12px' }}>
										<Row label="TAN" value={fmt(extraIot.tan_mg_l, 3)} unit="mg/L" badge={extraIot.tan_mg_l != null ? <span className={(extraIot.tan_mg_l ?? 0) > 0.5 ? 'badge bad' : 'badge good'}>{(extraIot.tan_mg_l ?? 0) > 0.5 ? 'HIGH' : 'OK'}</span> : undefined} />
										<Row label="NH₃ (Toxic)" value={fmt(extraIot.nh3_mg_l ?? extraIot.physics_calculations?.nh3?.nh3_mg_l, 4)} unit="mg/L" badge={(extraIot.nh3_mg_l ?? 0) > 0.1 ? <span className="badge bad">ALERT</span> : <span className="badge good">Safe</span>} />
										<Row label="Turbidity" value={fmt(extraIot.turbidity_ntu, 1)} unit="NTU" />
										<Row label="Secchi Depth" value={fmt(extraIot.secchi_cm, 1)} unit="cm" />
									</div>
								</div>
							</div>

							{/* Alerts Box */}
							<div>
								<h2 style={{ fontSize: '1.05rem', color: '#374151', marginBottom: 12 }}>
									System Alerts
								</h2>
								{(extraIot.alerts_raw ?? []).length > 0 ? (
									<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
										{(extraIot.alerts_raw ?? []).map((a, i) => (
											<div key={i} style={{
												padding: '10px 14px', borderRadius: 8,
												background: alertBg(a.status),
												borderLeft: `4px solid ${alertBorderColor(a.status)}`,
												fontSize: '0.85rem',
											}}>
												<strong style={{ color: alertBorderColor(a.status), display: 'block', marginBottom: 2 }}>{a.label}</strong>
												<span style={{ color: '#4b5563' }}>{a.value != null ? `(${a.value} ${a.unit ?? ''}) ` : ''}{a.message}</span>
											</div>
										))}
									</div>
								) : (
									<div style={{ background: '#f0fdf4', color: '#15803d', padding: '16px', borderRadius: 8, textAlign: 'center', border: '1px solid #bbf7d0' }}>
										✅ All parameters within optimal tracking range.<br/>No active warnings.
									</div>
								)}
							</div>

						</div>
					</div>
				</div>
			)}

			{/* AI Predictions Panel */}
			<div className="panel spanAll">
				<AIPredictionsPanel waterQuality={water} pondFilter={pondFilter} />
			</div>

			{/* What-if simulation panel driven by ML backend */}
			<WaterQualitySimulator
				defaultPh={extraIot?.ph ?? 7.5}
				defaultTemperature={extraIot?.temperature ?? 28}
				defaultDo={avgOxygen}
				defaultSalinity={extraIot?.salinity_ppt ?? 15}
			/>

			{/* Automatic Trigger System Panel */}
			<div className="panel spanAll">
				<AutoTriggerPanel
					systemEnabled={autoTrigger.systemEnabled}
					setSystemEnabled={autoTrigger.setSystemEnabled}
					devices={autoTrigger.devices}
					configs={autoTrigger.configs}
					events={autoTrigger.events}
					manualOverrides={autoTrigger.manualOverrides}
					esp32Connected={autoTrigger.esp32Connected}
					lastCheck={autoTrigger.lastCheck}
					onManualOverride={autoTrigger.setManualOverride}
					onToggleConfig={autoTrigger.toggleConfig}
					onStopDevice={autoTrigger.stopDevice}
					onAcknowledgeEvent={autoTrigger.acknowledgeEvent}
				/>
			</div>
		</div>
	)
}

