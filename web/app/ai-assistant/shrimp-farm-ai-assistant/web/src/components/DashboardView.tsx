import { Bar, Line } from 'react-chartjs-2'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	Filler,
	type ChartOptions
} from 'chart.js'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formatDateTime, formatNumber, formatPercent01 } from '../lib/format'
import type {
	DashboardApiResponse,
	DecisionOutput,
	DecisionRecommendation,
	SavedFarmSnapshot,
	WaterQualityStatus
} from '../lib/types'
import { WaterStatusBadge } from './StatusBadge'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend)

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function DashboardView({ data, history, pondFilter }: Props) {
	const { dashboard } = data
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed
	const energy = pondFilter ? data.energy.filter((e) => e.pond_id === pondFilter) : data.energy
	const labor = pondFilter ? data.labor.filter((l) => l.pond_id === pondFilter) : data.labor

	const pondIds = water.map((w) => w.pond_id)

	const gridColor = 'rgba(17, 24, 39, 0.08)'
	const axisColor = 'rgba(17, 24, 39, 0.55)'

	const barOptions: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false }
		},
		scales: {
			x: { grid: { display: false }, ticks: { color: axisColor } },
			y: { grid: { color: gridColor }, ticks: { color: axisColor } }
		}
	}

	const lineOptions: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false } },
		scales: {
			x: { grid: { display: false }, ticks: { color: axisColor } },
			y: { grid: { color: gridColor }, ticks: { color: axisColor } }
		},
		elements: { point: { radius: 3, hoverRadius: 4 } }
	}

	const waterStatus = summarizeWaterStatus(water.map((w) => w.status))
	const avgPh = avg(water.map((w) => w.ph))
	const avgSalinity = avg(water.map((w) => w.salinity))
	const avgOxygen = avg(water.map((w) => w.dissolved_oxygen))
	const avgTemp = avg(water.map((w) => w.temperature))
	// `feed_amount` is per-feeding (see sample generator); daily feed = amount * frequency.
	const totalFeedG = sum(feed.map((f) => f.feed_amount * (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 1)))
	const totalEnergyKwh = sum(energy.map((e) => e.total_energy))
	const totalEnergyCost = sum(energy.map((e) => e.cost))

	const actions = data.decisions?.recommended_actions ? Object.values(data.decisions.recommended_actions) : []
	const filteredActions = pondFilter ? actions.filter((a) => a.pond_id === pondFilter) : actions
	const decisionsSorted = [...filteredActions].sort((a, b) => a.priority_rank - b.priority_rank)
	const decisionRecos = (data.decision_recommendations ?? [])
		.filter((r) => (pondFilter ? r.pond_id === pondFilter : true))
		.sort((a, b) => a.priority_rank - b.priority_rank)
	const hasAction = (action: string) => filteredActions.some((a) => a.primary_action === action || a.secondary_actions?.includes(action as never))
	const aeratorsOn = hasAction('increase_aeration') || avg(energy.map((e) => (typeof e.aerator_usage === 'number' ? e.aerator_usage : 0))) > 0.35
	const pumpsOn = hasAction('water_exchange') || avg(energy.map((e) => (typeof e.pump_usage === 'number' ? e.pump_usage : 0))) > 0.25
	const feederActive = totalFeedG > 0

	const historyFiltered = history.map((snap) => ({
		...snap,
		water_quality: pondFilter ? snap.water_quality.filter((w) => w.pond_id === pondFilter) : snap.water_quality,
		feed: pondFilter ? snap.feed.filter((f) => f.pond_id === pondFilter) : snap.feed
	}))
	const historyLabels = historyFiltered.map((h) => shortDate(h.timestamp))
	const historyAvgWeight = historyFiltered.map((h) => avg(h.feed.map((f) => f.average_weight)))
	const historyTotalFeedKg = historyFiltered.map((h) => sum(h.feed.map((f) => f.feed_amount * (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 1))) / 1000)

	const latestBiomassKg = sum(feed.map((f) => (f.shrimp_count * f.average_weight) / 1000)) // g -> kg
	const projectedHarvestTons = latestBiomassKg / 1000
	const shrimpPricePerKg = 2000 // LKR per kg
	const feedCostPerKg = 400 // LKR per kg
	const estimatedRevenue = latestBiomassKg * shrimpPricePerKg
	const estimatedCosts = totalEnergyCost + (totalFeedG / 1000) * feedCostPerKg
	const profitMargin = estimatedRevenue > 0 ? (estimatedRevenue - estimatedCosts) / estimatedRevenue : 0
	const fcr = inferFcr(historyFiltered)
	const decisionSourceLabel = data.decision_agent_type ? String(data.decision_agent_type) : 'No decision model'
	const topActions = decisionsSorted.slice(0, 4)
	const recosByPond = groupBy(decisionRecos, (r) => String(r.pond_id))

	const alerts = buildAlerts({ dashboardAlerts: dashboard.alerts ?? [], water })
	const alertCounts = countAlerts(alerts)

	const growthChart = {
		labels: historyLabels,
		datasets: [
			{
				type: 'line' as const,
				label: 'Avg. Size (g)',
				data: historyAvgWeight,
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.10)',
				fill: true,
				tension: 0.35,
				pointRadius: 4,
				pointBackgroundColor: '#2563eb',
				pointBorderColor: '#ffffff',
				pointBorderWidth: 2
			}
		]
	}

	const feedChart = {
		labels: historyLabels,
		datasets: [
			{
				label: 'Daily feed (kg)',
				data: historyTotalFeedKg,
				backgroundColor: 'rgba(59, 130, 246, 0.85)',
				borderRadius: 6,
				maxBarThickness: 18
			}
		]
	}

	const yieldSeriesTons = historyFiltered.map((h) => sum(h.feed.map((f) => (f.shrimp_count * f.average_weight) / 1000)) / 1000)
	const revenueSeries = historyFiltered.map((h) => {
		const biomassKg = sum(h.feed.map((f) => (f.shrimp_count * f.average_weight) / 1000))
		return biomassKg * shrimpPricePerKg
	})

	const yieldChart = {
		labels: historyLabels,
		datasets: [
			{
				type: 'bar' as const,
				label: 'Yield (tons)',
				data: yieldSeriesTons,
				backgroundColor: 'rgba(34, 197, 94, 0.75)',
				borderRadius: 6,
				maxBarThickness: 18,
				yAxisID: 'y'
			},
			{
				type: 'line' as const,
				label: 'Revenue (LKR)',
				data: revenueSeries,
				borderColor: 'rgba(37, 99, 235, 0.95)',
				backgroundColor: 'rgba(37, 99, 235, 0.10)',
				fill: true,
				tension: 0.35,
				yAxisID: 'y1'
			}
		]
	}

	const yieldOptions: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false } },
		scales: {
			x: { grid: { display: false }, ticks: { color: axisColor } },
			y: { grid: { color: gridColor }, ticks: { color: axisColor }, title: { display: false, text: 'Tons' } },
			y1: {
				position: 'right',
				grid: { display: false },
				ticks: { color: axisColor, callback: (v) => `Rs. ${Number(v) / 1000}k` }
			}
		}
	}

	return (
		<div className="dashGrid">
			<div className="panel">
				<PanelHeader title="Water Quality" right={<WaterStatusBadge status={waterStatus.status} />} />
				<div className="waterCards">
					<ValueCard title="PH" value={formatNumber(avgPh, { maximumFractionDigits: 1 })} unit="" badge={phBadge(avgPh)} />
					<ValueCard title="Salinity" value={formatNumber(avgSalinity, { maximumFractionDigits: 0 })} unit="ppt" badge={salinityBadge(avgSalinity)} />
					<ValueCard title="Oxygen" value={formatNumber(avgOxygen, { maximumFractionDigits: 1 })} unit="mg/L" badge={oxygenBadge(avgOxygen)} />
				</div>
				<div className="tempCard">
					<div className="tempRow">
						<div className="tempTitle">Temperature</div>
						<div className="tempValue">
							<span className="mono">{formatNumber(avgTemp, { maximumFractionDigits: 1 })}</span>
							<span className="tempUnit">°C</span>
						</div>
					</div>
					<div className="tempWaves" aria-hidden="true" />
				</div>
				<div className="muted" style={{ marginTop: 10 }}>
					{pondFilter ? `Viewing Pond ${pondFilter}` : `${pondIds.length} ponds`} · {dashboard.alerts?.length ? `${dashboard.alerts.length} alert(s)` : 'No alerts'}
				</div>
			</div>

			<div className="panel">
				<PanelHeader title="Shrimp Growth & Feeding" right={<span className="muted">Updated {formatDateTime(dashboard.timestamp)}</span>} />
				<div className="twoCharts">
					<div className="chartPanel">
						<div className="chartTitle">Shrimp Growth</div>
						<div className="chartBoxSm">
							<Line data={growthChart as never} options={lineOptions} />
						</div>
						<div className="chartLegend">
							<span className="legendSwatch blue" /> Avg. Size (g)
							<span className="legendSwatch amber" style={{ marginLeft: 14 }} /> Feed (kg)
						</div>
					</div>
					<div className="chartPanel">
						<div className="chartTitle">
							Feed Consumption <span className="muted">Daily Feed: </span>
							<span className="mono">{formatNumber(totalFeedG / 1000, { maximumFractionDigits: 0 })}</span> kg
						</div>
						<div className="chartBoxSm">
							<Bar data={feedChart} options={barOptions} />
						</div>
					</div>
				</div>
			</div>

			<div className="panel">
				<PanelHeader title="IoT Sensor Network" />
				<div className="map">
					<div className="mapBg" aria-hidden="true" />
					{pondIds.map((id, idx) => (
						<MapMarker key={id} pondId={id} idx={idx} status={water.find((w) => w.pond_id === id)?.status ?? 'good'} />
					))}
				</div>
				<div className="legendRow">
					<LegendDot color="#ef4444" label="Temp" />
					<LegendDot color="#2563eb" label="DO" />
					<LegendDot color="#22c55e" label="pH" />
					<LegendDot color="#60a5fa" label="Salinity" />
				</div>
			</div>

			<div className="panel">
				<PanelHeader title="Farm Camera Feed" />
				<div className="camera">
					<div className="cameraViewport" role="img" aria-label="Camera feed placeholder">
						<div className="cameraOverlay">
							<div className="cameraPill">
								<span className="check" aria-hidden="true">
									✓
								</span>
								<span>
									Health Status: <b>Healthy</b>
								</span>
							</div>
							<div className="cameraIcons" aria-hidden="true">
								<span className="iconBox" />
								<span className="iconBox" />
							</div>
						</div>
					</div>
					<div className="cameraBadges">
						<SmallBadge tone="good" label="Normal Activity" />
						<SmallBadge tone="good" label="No Disease Detected" />
						<SmallBadge tone="good" label="Clear Water" />
					</div>


				</div>
			</div>

			<div className="panel">
				<PanelHeader title="Yield & Profit Analysis" />
				<div className="summaryStrip">
					<div className="summaryItem">
						<div className="muted">Projected Harvest:</div>
						<div className="summaryValue mono">{formatNumber(projectedHarvestTons, { maximumFractionDigits: 1 })} Tons</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Estimated Revenue:</div>
						<div className="summaryValue mono">Rs. {formatNumber(estimatedRevenue, { maximumFractionDigits: 0 })}</div>
					</div>
				</div>
				<div className="chartBoxLg">
					<Bar data={yieldChart as never} options={yieldOptions} />
				</div>
				<div className="kpiStrip">
					<div className="kpiMini">
						<div className="muted">FCR</div>
						<div className="kpiMiniValue mono">{typeof fcr === 'number' ? formatNumber(fcr, { maximumFractionDigits: 2 }) : '—'}</div>
					</div>
					<div className="kpiMini">
						<div className="muted">Profit Margin</div>
						<div className="kpiMiniValue mono">{formatNumber(profitMargin * 100, { maximumFractionDigits: 0 })}%</div>
					</div>
				</div>
			</div>

			<div className="panel spanAll">
				<PanelHeader
					title="Alerts"
					right={
						<div className="alertSummary" style={{ display: 'flex', gap: 6 }}>
							<Chip label={`Critical ${alertCounts.bad}`} tone="bad" />
							<Chip label={`Warning ${alertCounts.warn}`} tone="warn" />
							<Chip label={`Info ${alertCounts.info}`} tone="info" />
						</div>
					}
				/>
				{alerts.length ? (
					<div className="alertsList" style={{ padding: '8px 0', maxHeight: '200px', overflowY: 'auto' }}>
						{alerts.slice(0, 5).map((a, i) => (
							<div key={`${a.source}-${i}`} className="alertRow" style={{ padding: '6px 12px', marginBottom: 4 }}>
								<span className={`alertDot ${a.tone}`} aria-hidden="true" style={{ width: 6, height: 6, marginRight: 8 }} />
								<div className="alertTextWrap" style={{ flex: 1, minWidth: 0 }}>
									<div className="alertText" style={{ fontSize: 17, lineHeight: 1.4, marginBottom: 2 }}>{a.text}</div>
									<div className="alertMeta muted" style={{ fontSize: 17, color: 'var(--muted)' }}>
										{a.pondId ? <span className="mono">Pond {a.pondId}</span> : null}
										{a.pondId ? ' · ' : ''}
										{a.source}
									</div>
								</div>
								<div className="alertRight" style={{ marginLeft: 8 }}>
									<Chip label={a.label} tone={a.tone} />
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="emptyState" style={{ padding: '8px 0', fontSize: 17 }}>No active alerts.</div>
				)}
			</div>

			{dashboard.recommendations && dashboard.recommendations.length > 0 ? (
				<div className="panel spanAll">
					<PanelHeader
						title="AI Strategic Recommendations per Pond"
						right={<span className="muted">{dashboard.recommendations.length} recommendation(s)</span>}
					/>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: '16px 0' }}>
						{pondIds.map((pondId) => {
							const pondWater = water.find((w) => w.pond_id === pondId)
							const pondFeed = feed.find((f) => f.pond_id === pondId)
							const pondRecos = dashboard.recommendations.filter((rec) => {
								const match = rec.match(/\*\*Pond (\d+)\*\*/i)
								return match && parseInt(match[1]) === pondId
							})
							
							if (!pondWater && !pondFeed) return null

							// Determine status
							const getStatus = () => {
								if (!pondWater) return { label: 'Unknown', color: '#6b7280', icon: '❓' }
								if (pondWater.status === 'critical' || pondWater.status === 'poor') {
									return { label: 'Action Needed', color: '#ef4444', icon: '🔴' }
								}
								if (pondWater.status === 'fair') {
									return { label: 'Monitor', color: '#f59e0b', icon: '⚠️' }
								}
								return { label: 'Stable', color: '#16a34a', icon: '✅' }
							}

							// Determine stock type from average weight
							const getStockType = () => {
								if (!pondFeed) return { label: 'Unknown', icon: '❓', color: '#6b7280' }
								const weight = pondFeed.average_weight
								if (weight < 10) return { label: 'Juvenile', icon: '🐟', color: '#3b82f6' }
								return { label: 'Harvest-Ready', icon: '🌿', color: '#16a34a' }
							}

							const status = getStatus()
							const stockType = getStockType()
							const recommendation = pondRecos[0]?.replace(/\*\*[^*]+\*\*:?\s*/g, '').trim() || 'No specific recommendations at this time.'

							return (
								<div
									key={pondId}
									style={{
										border: `2px solid ${status.color}20`,
										borderRadius: 12,
										padding: 16,
										backgroundColor: 'rgba(255, 255, 255, 0.6)',
										display: 'flex',
										flexDirection: 'column',
										gap: 12
									}}
								>
									{/* Header with Status */}
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<span style={{ fontSize: 18 }}>{status.icon}</span>
											<span style={{ fontSize: 18, fontWeight: 700, color: status.color }}>{status.label}</span>
										</div>
										<span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Pond {pondId}</span>
									</div>

									{/* Metrics */}
									{pondWater && (
										<div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', backgroundColor: 'rgba(17, 24, 39, 0.03)', borderRadius: 8 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<span style={{ fontSize: 18 }}>🧪</span>
												<span style={{ fontSize: 18, color: 'var(--text)' }}>pH: <strong>{pondWater.ph.toFixed(1)}</strong></span>
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<span style={{ fontSize: 18 }}>🌿</span>
												<span style={{ fontSize: 18, color: 'var(--text)' }}>DO: <strong>{pondWater.dissolved_oxygen.toFixed(1)} mg/L</strong></span>
											</div>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<span style={{ fontSize: 18 }}>🌡️</span>
												<span style={{ fontSize: 18, color: 'var(--text)' }}>Temperature: <strong>{pondWater.temperature.toFixed(1)}°C</strong></span>
											</div>
										</div>
									)}

									{/* Stock Type */}
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: `${stockType.color}15`, borderRadius: 6 }}>
										<span style={{ fontSize: 18 }}>{stockType.icon}</span>
										<span style={{ fontSize: 18, fontWeight: 600, color: stockType.color }}>{stockType.label}</span>
									</div>

									{/* Recommendations */}
									<div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>
										{recommendation}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			) : null}

			{dashboard.insights && dashboard.insights.length > 0 ? (
				<div className="panel spanAll">
					<PanelHeader
						title="Manager Agent Insights"
						right={
							<div className="alertSummary">
								{(() => {
									const counts = { critical: 0, warning: 0, info: 0 }
									dashboard.insights.forEach((insight) => {
										if (insight.priority === 'critical') counts.critical++
										else if (insight.priority === 'warning') counts.warning++
										else counts.info++
									})
									return (
										<>
											{counts.critical > 0 && <Chip label={`Critical ${counts.critical}`} tone="bad" />}
											{counts.warning > 0 && <Chip label={`Warning ${counts.warning}`} tone="warn" />}
											{counts.info > 0 && <Chip label={`Info ${counts.info}`} tone="info" />}
										</>
									)
								})()}
							</div>
						}
					/>
					<div className="alertsList">
						{dashboard.insights
							.sort((a, b) => {
								// Sort by priority: critical > warning > info
								const priorityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
								return priorityOrder[a.priority] - priorityOrder[b.priority]
							})
							.map((insight, i) => {
								const priorityTone: ChipTone = insight.priority === 'critical' ? 'bad' : insight.priority === 'warning' ? 'warn' : 'info'
								const borderColor =
									insight.priority === 'critical'
										? 'rgba(239, 68, 68, 0.6)'
										: insight.priority === 'warning'
											? 'rgba(245, 158, 11, 0.6)'
											: 'rgba(59, 130, 246, 0.6)'
								return (
									<div
										key={i}
										className="insightCard"
										style={{
											borderLeft: `4px solid ${borderColor}`,
											padding: '16px',
											marginBottom: '12px',
											backgroundColor: 'rgba(255, 255, 255, 0.5)',
											borderRadius: '8px'
										}}
									>
										<div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
											<div style={{ flex: 1 }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
													<Chip label={insight.insight_type} tone={priorityTone} />
													{insight.affected_ponds && insight.affected_ponds.length > 0 && (
														<span className="muted" style={{ fontSize: '0.875rem' }}>
															Ponds: {insight.affected_ponds.map((id) => `Pond ${id}`).join(', ')}
														</span>
													)}
												</div>
												<div className="alertText" style={{ color: 'rgba(17, 24, 39, 0.9)', marginBottom: '8px', lineHeight: '1.5' }}>
													{insight.message}
												</div>
												{insight.recommendations && insight.recommendations.length > 0 && (
													<div style={{ marginTop: '10px' }}>
														<div className="muted" style={{ fontSize: '0.875rem', marginBottom: '6px', fontWeight: 500 }}>
															Recommendations:
														</div>
														<ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(17, 24, 39, 0.75)' }}>
															{insight.recommendations.map((rec, j) => (
																<li key={j} style={{ marginBottom: '4px', lineHeight: '1.5' }}>
																	{rec}
																</li>
															))}
														</ul>
													</div>
												)}
											</div>
											<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
												<Chip label={insight.priority.toUpperCase()} tone={priorityTone} />
												<span className="muted" style={{ fontSize: '0.75rem' }}>
													{formatDateTime(insight.timestamp)}
												</span>
											</div>
										</div>
									</div>
								)
							})}
					</div>
				</div>
			) : null}

		</div>
	)
}

function PanelHeader({ title, right }: { title: string; right?: ReactNode }) {
	return (
		<div className="panelHeader">
			<div className="panelTitle">{title}</div>
			<div className="panelRight">
				{right ?? null}
				<span className="panelCollapse" aria-hidden="true">
					—
				</span>
			</div>
		</div>
	)
}

function ValueCard({
	title,
	value,
	unit,
	badge
}: {
	title: string
	value: string
	unit: string
	badge: { label: string; tone: 'good' | 'warn' | 'info' }
}) {
	return (
		<div className="valueCard">
			<div className="valueTitle">{title}</div>
			<div className="valueMain">
				<span className="valueNumber mono">{value}</span>
				{unit ? <span className="valueUnit">{unit}</span> : null}
			</div>
			<div className={`valueBadge ${badge.tone}`}>{badge.label}</div>
		</div>
	)
}

function ControlRow({ label, state, tone }: { label: string; state: string; tone: 'good' | 'warn' | 'info' }) {
	return (
		<div className="controlRow">
			<div className="controlLabel">{label}</div>
			<div className={`controlState ${tone}`}>{state}</div>
		</div>
	)
}

function ActionButton({ label }: { label: string }) {
	return (
		<button className="actionBtn" onClick={() => void 0} type="button">
			{label}
		</button>
	)
}

function SmallBadge({ tone, label }: { tone: 'good' | 'warn' | 'info'; label: string }) {
	return <div className={`smallBadge ${tone}`}>{label}</div>
}

function MapMarker({ pondId, idx, status }: { pondId: number; idx: number; status: WaterQualityStatus }) {
	const positions = [
		{ left: '18%', top: '22%' },
		{ left: '26%', top: '54%' },
		{ left: '72%', top: '56%' },
		{ left: '48%', top: '72%' },
		{ left: '68%', top: '28%' },
		{ left: '40%', top: '38%' },
		{ left: '84%', top: '34%' },
		{ left: '12%', top: '70%' }
	]
	const pos = positions[idx % positions.length]
	const tone = status === 'excellent' || status === 'good' ? 'good' : status === 'fair' ? 'warn' : 'bad'
	return (
		<div className={`mapMarker ${tone}`} style={{ left: pos.left, top: pos.top }}>
			<div className="pin" aria-hidden="true" />
			<div className="mapLabel">Pond {pondId}</div>
		</div>
	)
}

function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<div className="legendDot">
			<span className="dotSwatch" style={{ background: color }} aria-hidden="true" />
			<span className="muted">{label}</span>
		</div>
	)
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="miniStat">
			<div className="muted">{label}</div>
			<div className="miniStatValue mono">{value}</div>
		</div>
	)
}

function DecisionCard({ d }: { d: DecisionOutput }) {
	const urgencyTone = toneForScore(d.urgency_score)
	const confTone = toneForScore(d.confidence)
	return (
		<div className="decisionCard">
			<div className="decisionCardTop">
				<div>
					<div className="decisionCardTitle">
						<Chip label={`#${d.priority_rank}`} tone="info" /> <span className="mono">Pond {d.pond_id}</span>
					</div>
					<div className="decisionCardAction">{actionLabel(d.primary_action)}</div>
				</div>
				<div className="decisionCardBadges">
					<Chip label={`Urgency ${formatPercent01(d.urgency_score)}`} tone={urgencyTone} />
					<Chip label={`Conf ${formatPercent01(d.confidence)}`} tone={confTone} />
				</div>
			</div>

			<div className="decisionBars">
				<BarMeter label="Urgency" value01={clamp01(d.urgency_score)} tone={urgencyTone} />
				<BarMeter label="Confidence" value01={clamp01(d.confidence)} tone={confTone} />
			</div>

			<div className="decisionSettings">
				<div className="muted">Suggested settings</div>
				<div className="settingsGrid">
					<SettingItem label="Feed" value={fmtMaybeNumber(d.recommended_feed_amount, 'g')} />
					<SettingItem label="Aerator" value={fmtMaybeNumber(d.recommended_aerator_level, '%')} />
					<SettingItem label="Pump" value={fmtMaybeNumber(d.recommended_pump_level, '%')} />
					<SettingItem label="Heater" value={fmtMaybeNumber(d.recommended_heater_level, '%')} />
				</div>
			</div>
		</div>
	)
}

function BarMeter({ label, value01, tone }: { label: string; value01: number; tone: ChipTone }) {
	return (
		<div className="barMeter">
			<div className="barMeterRow">
				<span className="muted">{label}</span>
				<span className="mono">{formatNumber(value01 * 100, { maximumFractionDigits: 0 })}%</span>
			</div>
			<div className="barTrack">
				<div className={`barFill ${tone}`} style={{ width: `${Math.round(value01 * 100)}%` }} />
			</div>
		</div>
	)
}

function SettingItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="settingItem">
			<div className="muted">{label}</div>
			<div className="settingValue mono">{value}</div>
		</div>
	)
}

type ChipTone = 'good' | 'warn' | 'bad' | 'info'

function Chip({ label, tone }: { label: string; tone: ChipTone }) {
	return <span className={`chip ${tone}`}>{label}</span>
}

function summarizeWaterStatus(statuses: WaterQualityStatus[]) {
	// Worst status wins.
	const order: WaterQualityStatus[] = ['excellent', 'good', 'fair', 'poor', 'critical']
	let worst: WaterQualityStatus = 'excellent'
	for (const s of statuses) {
		if (order.indexOf(s) > order.indexOf(worst)) worst = s
	}
	return { status: worst, label: worst.toUpperCase(), count: statuses.length }
}

function sum(values: number[]) {
	return values.reduce((a, b) => a + b, 0)
}

function avg(values: number[]) {
	if (!values.length) return 0
	return sum(values) / values.length
}

function shortDate(iso: string) {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

function phBadge(ph: number) {
	if (ph >= 7.5 && ph <= 8.5) return { label: 'Optimal', tone: 'info' as const }
	if (ph >= 7.0 && ph <= 9.0) return { label: 'Normal', tone: 'warn' as const }
	return { label: 'Alert', tone: 'warn' as const }
}

function salinityBadge(sal: number) {
	if (sal >= 15 && sal <= 25) return { label: 'Normal', tone: 'good' as const }
	if (sal >= 10 && sal <= 30) return { label: 'Caution', tone: 'warn' as const }
	return { label: 'Alert', tone: 'warn' as const }
}

function oxygenBadge(o2: number) {
	if (o2 >= 6.0) return { label: 'Good', tone: 'good' as const }
	if (o2 >= 5.0) return { label: 'Caution', tone: 'warn' as const }
	return { label: 'Low', tone: 'warn' as const }
}

function inferFcr(historyFiltered: Array<{ feed: Array<{ shrimp_count: number; average_weight: number; feed_amount: number }> }>) {
	if (historyFiltered.length < 2) return null
	const last = historyFiltered[historyFiltered.length - 1]
	const prev = historyFiltered[historyFiltered.length - 2]
	const biomassKg = (h: typeof last) => sum(h.feed.map((f) => (f.shrimp_count * f.average_weight) / 1000))
	const gain = biomassKg(last) - biomassKg(prev)
	if (gain <= 0) return null
	const feedKg = sum(last.feed.map((f) => f.feed_amount)) / 1000
	return feedKg / gain
}

function actionLabel(action: string) {
	const map: Record<string, string> = {
		no_action: 'No action',
		increase_aeration: 'Increase aeration',
		decrease_aeration: 'Decrease aeration',
		water_exchange: 'Water exchange',
		adjust_feed: 'Adjust feed',
		emergency_response: 'Emergency response',
		allocate_workers: 'Allocate workers',
		equipment_maintenance: 'Equipment maintenance',
		monitor_closely: 'Monitor closely'
	}
	if (map[action]) return map[action]
	return String(action)
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (m: string) => m.toUpperCase())
}

function toneForScore(v: number): ChipTone {
	const x = clamp01(v)
	if (x >= 0.8) return 'bad'
	if (x >= 0.6) return 'warn'
	if (x >= 0.3) return 'info'
	return 'good'
}

function clamp01(v: number) {
	if (!Number.isFinite(v)) return 0
	return Math.max(0, Math.min(1, v))
}

function fmtMaybeNumber(v: number | null, unit: string) {
	if (v === null || !Number.isFinite(v)) return '—'
	// If unit is %, treat as 0..1 (common for levels) and also accept 0..100.
	if (unit === '%') {
		const pct = v <= 1 ? v * 100 : v
		return `${formatNumber(pct, { maximumFractionDigits: 0 })}${unit}`
	}
	return `${formatNumber(v, { maximumFractionDigits: 0 })} ${unit}`
}

function formatSettings(d: DecisionOutput) {
	const parts: string[] = []
	if (d.recommended_feed_amount != null) parts.push(`Feed ${fmtMaybeNumber(d.recommended_feed_amount, 'g')}`)
	if (d.recommended_aerator_level != null) parts.push(`Aerator ${fmtMaybeNumber(d.recommended_aerator_level, '%')}`)
	if (d.recommended_pump_level != null) parts.push(`Pump ${fmtMaybeNumber(d.recommended_pump_level, '%')}`)
	if (d.recommended_heater_level != null) parts.push(`Heater ${fmtMaybeNumber(d.recommended_heater_level, '%')}`)
	return parts.length ? parts.join(' · ') : '—'
}

function groupBy<T>(items: T[], key: (t: T) => string) {
	return items.reduce<Record<string, T[]>>((acc, item) => {
		const k = key(item)
		if (!acc[k]) acc[k] = []
		acc[k].push(item)
		return acc
	}, {})
}

function buildAlerts(params: { dashboardAlerts: string[]; water: Array<{ pond_id: number; alerts: string[] }> }) {
	const { dashboardAlerts, water } = params
	const out: Array<{ text: string; tone: ChipTone; label: string; pondId: number | null; source: string }> = []

	for (const text of dashboardAlerts) {
		const level = inferAlertTone(text)
		out.push({ text, tone: level.tone, label: level.label, pondId: inferPondId(text), source: 'Dashboard' })
	}

	for (const w of water) {
		for (const text of w.alerts ?? []) {
			const level = inferAlertTone(text)
			out.push({ text, tone: level.tone, label: level.label, pondId: w.pond_id, source: 'Water quality' })
		}
	}

	// Dedupe on (text, pondId, source)
	const seen = new Set<string>()
	const deduped: typeof out = []
	for (const a of out) {
		const k = `${a.source}|${a.pondId ?? ''}|${a.text}`
		if (seen.has(k)) continue
		seen.add(k)
		deduped.push(a)
	}

	// Sort: critical, warning, info.
	const order: Record<ChipTone, number> = { bad: 0, warn: 1, info: 2, good: 3 }
	deduped.sort((a, b) => order[a.tone] - order[b.tone])
	return deduped
}

function inferPondId(text: string): number | null {
	const m = text.match(/pond\s*(\d+)/i)
	if (!m) return null
	const n = Number(m[1])
	return Number.isFinite(n) ? n : null
}

function inferAlertTone(text: string): { tone: ChipTone; label: string } {
	const t = text.toLowerCase()
	if (t.includes('critical')) return { tone: 'bad', label: 'CRITICAL' }
	if (t.includes('warning')) return { tone: 'warn', label: 'WARNING' }
	return { tone: 'info', label: 'INFO' }
}

function countAlerts(alerts: Array<{ tone: ChipTone }>) {
	const counts = { bad: 0, warn: 0, info: 0 }
	for (const a of alerts) {
		if (a.tone === 'bad') counts.bad += 1
		else if (a.tone === 'warn') counts.warn += 1
		else if (a.tone === 'info') counts.info += 1
	}
	return counts
}

function calculateHarvestWindow(avgWeightHistory: number[]): string {
	if (avgWeightHistory.length < 2) {
		const today = new Date()
		const harvestDate = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000)
		const harvestEndDate = new Date(harvestDate.getTime() + 10 * 24 * 60 * 60 * 1000)
		const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		return `${monthNames[harvestDate.getMonth()]} ${harvestDate.getDate()} – ${monthNames[harvestEndDate.getMonth()]} ${harvestEndDate.getDate()}`
	}
	
	const currentWeight = avgWeightHistory[avgWeightHistory.length - 1]
	const prevWeight = avgWeightHistory[avgWeightHistory.length - 2] || currentWeight
	const growthRate = Math.max(0.1, currentWeight - prevWeight)
	
	// Estimate days to reach harvest size (typically 20-25g)
	const targetWeight = 22
	const daysToHarvest = Math.max(10, Math.min(30, Math.round((targetWeight - currentWeight) / growthRate)))
	
	const today = new Date()
	const harvestDate = new Date(today.getTime() + daysToHarvest * 24 * 60 * 60 * 1000)
	const harvestEndDate = new Date(harvestDate.getTime() + 10 * 24 * 60 * 60 * 1000)
	
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	return `${monthNames[harvestDate.getMonth()]} ${harvestDate.getDate()} – ${monthNames[harvestEndDate.getMonth()]} ${harvestEndDate.getDate()}`
}

type ActionPlanCardProps = {
	title: string
	icon: string
	details: string[]
	chartData?: { labels: string[]; data: number[]; color: string }
	laborData?: { totalWorkers: number; tasksCompleted: number; efficiency: number }
	harvestChartData?: {
		labels: string[]
		waterData: Array<{ temp: number; do: number; ph: number; salinity: number }>
	}
}

function ActionPlanCard({ title, icon, details, chartData, laborData, harvestChartData }: ActionPlanCardProps) {
	const [expanded, setExpanded] = useState(true)

	return (
		<div className="actionPlanCard">
			<div className="actionPlanHeader" onClick={() => setExpanded(!expanded)}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<div className="actionPlanIcon">{icon}</div>
					<h3 className="actionPlanTitle">{title}</h3>
				</div>
				<button
					className="actionPlanToggle"
					onClick={(e) => {
						e.stopPropagation()
						setExpanded(!expanded)
					}}
					type="button"
					aria-label={expanded ? 'Collapse' : 'Expand'}
				>
					<span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
						▼
					</span>
				</button>
			</div>
			{expanded && (
				<div className="actionPlanContent">
					<div className="actionPlanDetails">
						{details.map((detail, i) => {
							const parts = detail.split(/(\*\*[^*]+\*\*)/g)
							return (
								<div key={i} style={{ marginBottom: '8px', lineHeight: '1.6', color: 'rgba(17, 24, 39, 0.85)' }}>
									{parts.map((part, j) => {
										if (part.startsWith('**') && part.endsWith('**')) {
											const text = part.slice(2, -2)
											return <strong key={j} style={{ color: 'rgba(17, 24, 39, 0.95)' }}>{text}</strong>
										}
										return <span key={j}>{part}</span>
									})}
								</div>
							)
						})}
					</div>
					{chartData && (
						<div className="actionPlanChart">
							<Bar
								data={{
									labels: chartData.labels,
									datasets: [
										{
											label: 'Feed (kg)',
											data: chartData.data,
											backgroundColor: chartData.color,
											borderRadius: 6,
											maxBarThickness: 20
										}
									]
								}}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: { legend: { display: false } },
									scales: {
										x: { grid: { display: false }, ticks: { color: 'rgba(17, 24, 39, 0.55)', font: { size: 10 } } },
										y: { grid: { color: 'rgba(17, 24, 39, 0.08)' }, ticks: { color: 'rgba(17, 24, 39, 0.55)', font: { size: 10 } } }
									}
								}}
							/>
						</div>
					)}
					{laborData && (
						<div className="actionPlanLabor">
							<div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
								{[...Array(Math.min(3, Math.ceil(laborData.totalWorkers / 2)))].map((_, i) => (
									<div key={i} className="laborIcon" style={{ backgroundColor: '#3b82f6' }}>👤</div>
								))}
								{[...Array(Math.min(3, Math.ceil(laborData.totalWorkers / 2)))].map((_, i) => (
									<div key={i + 3} className="laborIcon" style={{ backgroundColor: '#22c55e' }}>👤</div>
								))}
								<div className="laborIcon" style={{ backgroundColor: '#94a3b8' }}>📋</div>
							</div>
						</div>
					)}
					{harvestChartData && (
						<div className="actionPlanChart">
							<Bar
								data={{
									labels: harvestChartData.labels,
									datasets: [
										{
											label: 'Temp',
											data: harvestChartData.waterData.map((d) => Math.max(0, (d.temp - 20) * 2)),
											backgroundColor: 'rgba(239, 68, 68, 0.7)'
										},
										{
											label: 'DO',
											data: harvestChartData.waterData.map((d) => Math.max(0, (d.do - 4) * 2)),
											backgroundColor: 'rgba(59, 130, 246, 0.7)'
										},
										{
											label: 'pH',
											data: harvestChartData.waterData.map((d) => Math.max(0, (d.ph - 7) * 4)),
											backgroundColor: 'rgba(34, 197, 94, 0.7)'
										},
										{
											label: 'Salinity',
											data: harvestChartData.waterData.map((d) => Math.max(0, (d.salinity - 10) * 0.5)),
											backgroundColor: 'rgba(96, 165, 250, 0.7)'
										}
									]
								}}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									plugins: { 
										legend: { display: false },
										tooltip: {
											callbacks: {
												label: function(context) {
													const datasetLabel = context.dataset.label || ''
													const value = context.parsed.y
													// Reverse normalization for display
													let displayValue = value
													if (datasetLabel === 'Temp') displayValue = (value / 2) + 20
													else if (datasetLabel === 'DO') displayValue = (value / 2) + 4
													else if (datasetLabel === 'pH') displayValue = (value / 4) + 7
													else if (datasetLabel === 'Salinity') displayValue = (value / 0.5) + 10
													return `${datasetLabel}: ${formatNumber(displayValue, { maximumFractionDigits: 1 })}`
												}
											}
										}
									},
									scales: {
										x: { 
											grid: { display: false }, 
											ticks: { color: 'rgba(17, 24, 39, 0.55)', font: { size: 10 } },
											stacked: true
										},
										y: { 
											grid: { color: 'rgba(17, 24, 39, 0.08)' }, 
											ticks: { color: 'rgba(17, 24, 39, 0.55)', font: { size: 10 } },
											stacked: true
										}
									}
								}}
							/>
							<div className="chartLegend" style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
								<LegendDot color="#ef4444" label="Temp" />
								<LegendDot color="#3b82f6" label="DO" />
								<LegendDot color="#22c55e" label="pH" />
								<LegendDot color="#60a5fa" label="Salinity" />
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}


