import { Line, Bar } from 'react-chartjs-2'
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
import type { DashboardApiResponse, HarvestMlPondResult } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { useHarvestMlData } from '../lib/useHarvestMlData'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend)

type HarvestMlBundle = ReturnType<typeof useHarvestMlData>

const POND_LINE_COLORS = [
	{ border: '#2563eb', fill: 'rgba(37, 99, 235, 0.12)' },
	{ border: '#16a34a', fill: 'rgba(22, 163, 74, 0.12)' },
	{ border: '#d97706', fill: 'rgba(217, 119, 6, 0.12)' },
	{ border: '#7c3aed', fill: 'rgba(124, 58, 237, 0.12)' },
	{ border: '#db2777', fill: 'rgba(219, 39, 119, 0.12)' },
	{ border: '#0891b2', fill: 'rgba(8, 145, 178, 0.12)' }
]

const READY = '#16a34a'
const NEAR = '#ca8a04'
const NOT_READY = '#0891b2'

type Props = {
	data: DashboardApiResponse
	harvestMl: HarvestMlBundle
}

function pondStatus(row: HarvestMlPondResult, feedWeight: number, targetG: number): { label: string; color: string } {
	if (!row.available) {
		return { label: 'No ML data', color: 'rgba(17,24,39,0.35)' }
	}
	const w = row.growth_forecast?.length
		? row.growth_forecast[row.growth_forecast.length - 1].avg_weight_g
		: feedWeight
	const dth = row.days_to_harvest ?? 99
	if (dth <= 7 && w >= targetG * 0.85) return { label: 'Ready to harvest', color: READY }
	if (dth <= 21 || w >= targetG * 0.75) return { label: 'Near ready', color: NEAR }
	return { label: 'Not ready', color: NOT_READY }
}

function aiConfidence(row: HarvestMlPondResult): number {
	if (!row.available) return 0
	const risk = row.early_harvest?.probability ?? 0
	return Math.round(Math.min(100, Math.max(40, 92 - risk * 45)))
}

export function HarvestPredictionView({ data, harvestMl }: Props) {
	const targetG = harvestMl.data?.target_weight_g ?? 22
	const pondIds = [...new Set(data.water_quality.map((w) => w.pond_id))].sort((a, b) => a - b)
	const rows = harvestMl.data?.ponds ?? []
	const byPond = (id: number) => rows.find((r) => r.pond_id === id)
	const mlActive = harvestMl.data?.source === 'xgboost' && rows.some((r) => r.available)

	const feedByPond = (pid: number) => data.feed.find((f) => f.pond_id === pid)
	const waterByPond = (pid: number) => data.water_quality.find((w) => w.pond_id === pid)

	const availableRows = rows.filter((r) => r.available)
	let earliestHarvest: Date | null = null
	for (const r of availableRows) {
		if (!r.predicted_harvest_start) continue
		const d = new Date(r.predicted_harvest_start)
		if (!Number.isNaN(d.getTime()) && (!earliestHarvest || d < earliestHarvest)) earliestHarvest = d
	}
	const now = new Date()
	const daysToHarvestMin =
		earliestHarvest != null
			? Math.max(0, Math.ceil((earliestHarvest.getTime() - now.getTime()) / 86400000))
			: null

	const totalYieldKg = availableRows.reduce((s, r) => s + (r.expected_biomass_kg ?? 0), 0)
	const avgWeightG =
		pondIds.length > 0
			? pondIds.reduce((s, pid) => s + (feedByPond(pid)?.average_weight ?? 0), 0) / pondIds.length
			: 0

	let growthRateDay = 0.35
	if (availableRows[0]?.growth_forecast && availableRows[0].growth_forecast.length >= 2) {
		const g = availableRows[0].growth_forecast
		const a = g[0].avg_weight_g
		const b = g[g.length - 1].avg_weight_g
		growthRateDay = (b - a) / Math.max(1, g.length - 1)
	}

	const readinessPct = Math.min(
		100,
		Math.round((avgWeightG / Math.max(1, targetG)) * 100 * 0.85 + (availableRows.length ? 15 : 0))
	)

	const maxHorizon = Math.max(
		30,
		...rows.map((r) => (r.growth_forecast?.length ? r.growth_forecast.length : 0))
	)

	const growthLineData = {
		labels: Array.from({ length: maxHorizon }, (_, i) => i),
		datasets: pondIds.map((pid, idx) => {
			const r = byPond(pid)
			const pts =
				r?.available && r.growth_forecast?.length
					? r.growth_forecast.map((p) => p.avg_weight_g)
					: []
			const padded = Array.from({ length: maxHorizon }, (_, i) => pts[i] ?? null)
			const c = POND_LINE_COLORS[idx % POND_LINE_COLORS.length]
			return {
				label: `Pond ${pid}`,
				data: padded,
				borderColor: c.border,
				backgroundColor: c.fill,
				fill: false,
				tension: 0.35,
				spanGaps: false,
				pointRadius: maxHorizon > 40 ? 0 : 3
			}
		})
	}

	const yieldBarData = {
		labels: pondIds.map((p) => `Pond ${p}`),
		datasets: [
			{
				label: 'Expected yield (kg)',
				data: pondIds.map((pid) => {
					const r = byPond(pid)
					return r?.available ? r.expected_biomass_kg ?? 0 : 0
				}),
				backgroundColor: pondIds.map((_, i) => POND_LINE_COLORS[i % POND_LINE_COLORS.length].border),
				borderRadius: 6
			}
		]
	}

	const biomassByDay: number[] = Array.from({ length: maxHorizon }, () => 0)
	let anyBiomass = false
	for (const pid of pondIds) {
		const r = byPond(pid)
		if (!r?.available || !r.growth_forecast?.length) continue
		anyBiomass = true
		r.growth_forecast.forEach((pt, i) => {
			if (i < maxHorizon) biomassByDay[i] += pt.biomass_kg
		})
	}
	const biomassAreaData = {
		labels: Array.from({ length: maxHorizon }, (_, i) => i),
		datasets: [
			{
				label: 'Total biomass (kg)',
				data: biomassByDay,
				borderColor: '#0f766e',
				backgroundColor: 'rgba(15, 118, 110, 0.2)',
				fill: true,
				tension: 0.4,
				pointRadius: 0
			}
		]
	}

	const chartOpts: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
		},
		scales: {
			x: {
				grid: { color: 'rgba(17,24,39,0.06)' },
				ticks: { maxTicksLimit: 12, color: 'rgba(17,24,39,0.55)' }
			},
			y: { grid: { color: 'rgba(17,24,39,0.08)' }, ticks: { color: 'rgba(17,24,39,0.55)' } }
		}
	}
	const barOpts: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false } },
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17,24,39,0.08)' }, beginAtZero: true }
		}
	}

	const recs: { pond: number; tone: 'good' | 'warn' | 'info'; text: string }[] = []
	for (const pid of pondIds) {
		const r = byPond(pid)
		const f = feedByPond(pid)
		const w = waterByPond(pid)
		if (r?.available) {
			if (r.days_to_harvest != null && r.days_to_harvest <= 5) {
				recs.push({
					pond: pid,
					tone: 'good',
					text: `Prepare harvest equipment — pond ${pid} is within ~${r.days_to_harvest} days of the model window.`
				})
			} else if (r.early_harvest?.risk) {
				recs.push({
					pond: pid,
					tone: 'warn',
					text: `Early harvest risk (${formatNumber((r.early_harvest.probability ?? 0) * 100, { maximumFractionDigits: 0 })}%) — review ${(r.early_harvest.reason_codes ?? []).join(', ') || 'conditions'}.`
				})
			} else if ((r.days_to_harvest ?? 0) > 14) {
				recs.push({
					pond: pid,
					tone: 'info',
					text: `Growth runway remains — consider feed and water tuning to reach target ~${targetG} g.`
				})
			} else {
				recs.push({
					pond: pid,
					tone: 'good',
					text: `Trajectory stable; continue monitoring until harvest window.`
				})
			}
		} else {
			recs.push({
				pond: pid,
				tone: 'info',
				text: `No Mongo-backed ML row for pond ${pid}. Ingest latest water + feed readings for predictions.`
			})
		}
		if (w && w.dissolved_oxygen < 5) {
			recs.push({
				pond: pid,
				tone: 'warn',
				text: `Dissolved oxygen is low (${formatNumber(w.dissolved_oxygen, { maximumFractionDigits: 1 })} mg/L) — aeration check.`
			})
		}
	}
	const uniqueRecs = recs.slice(0, 6)

	const risks: { label: string; pond: string; status: string; bad?: boolean }[] = []
	for (const pid of pondIds) {
		const w = waterByPond(pid)
		if (!w) continue
		if (w.dissolved_oxygen < 5.5)
			risks.push({
				label: 'Dissolved oxygen',
				pond: `Pond ${pid}`,
				status: w.dissolved_oxygen < 4.5 ? 'Below threshold' : 'Fluctuating / watch',
				bad: w.dissolved_oxygen < 4.5
			})
		if (w.temperature < 26 || w.temperature > 32)
			risks.push({
				label: 'Temperature',
				pond: `Pond ${pid}`,
				status: w.temperature < 26 ? 'Lower band' : 'Upper band',
				bad: w.temperature > 31.5
			})
	}
	for (const r of availableRows) {
		if (r.early_harvest?.risk)
			risks.push({
				label: 'Early harvest (ML)',
				pond: `Pond ${r.pond_id}`,
				status: `${formatNumber((r.early_harvest.probability ?? 0) * 100, { maximumFractionDigits: 0 })}%`,
				bad: true
			})
	}

	const criticalAlerts = risks.filter((x) => x.bad).length

	return (
		<div className="harvestPredictionPage">
			<div className="harvestPredictionHeader">
				<div>
					<h1 className="harvestPredictionTitle">Harvest prediction</h1>
					<p className="harvestPredictionSubtitle">
						AI-powered insights and forecasting for optimal harvest timing (XGBoost + MongoDB readings).
					</p>
				</div>
				<div className="harvestPredictionHeaderMeta">
					{harvestMl.loading ? <span className="muted">Loading ML…</span> : null}
					{harvestMl.data?.source === 'xgboost' ? (
						<span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
							{harvestMl.data.input_source === 'mongodb' ? 'MongoDB inputs' : harvestMl.data.input_source ?? 'ML'}
						</span>
					) : (
						<span className="badge warn">ML unavailable</span>
					)}
				</div>
			</div>

			{harvestMl.error ? (
				<div className="panel harvestPredictionBanner bad">{harvestMl.error}</div>
			) : null}
			{harvestMl.data?.detail && !mlActive ? (
				<div className="panel harvestPredictionBanner warn">{harvestMl.data.detail}</div>
			) : null}

			<div className="harvestKpiRow">
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Estimated harvest</div>
					<div className="harvestKpiValue">
						{earliestHarvest
							? earliestHarvest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
							: '—'}
					</div>
					<div className="harvestKpiHint">
						{daysToHarvestMin != null ? `${daysToHarvestMin} days remaining (earliest pond)` : 'Load ML + Mongo readings'}
					</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Predicted total yield</div>
					<div className="harvestKpiValue">{formatNumber(totalYieldKg, { maximumFractionDigits: 0 })} kg</div>
					<div className="harvestKpiHint">Sum of expected biomass (ML)</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Average shrimp weight</div>
					<div className="harvestKpiValue">{formatNumber(avgWeightG, { maximumFractionDigits: 1 })} g</div>
					<div className="harvestKpiHint">Live dashboard feed average</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Growth rate</div>
					<div className="harvestKpiValue">{formatNumber(growthRateDay, { maximumFractionDigits: 2 })} g/day</div>
					<div className="harvestKpiHint">{mlActive ? 'From ML trajectory' : 'Approximate'}</div>
				</div>
				<div className="harvestKpiCard panel harvestKpiGaugeCard">
					<div className="muted harvestKpiLabel">Harvest readiness</div>
					<div className="harvestGaugeWrap" aria-hidden>
						<div
							className="harvestGaugeRing"
							style={{
								background: `conic-gradient(${READY} ${readinessPct}%, rgba(17,24,39,0.08) 0)`
							}}
						/>
						<div className="harvestGaugeInner">
							<span className="harvestGaugePct">{readinessPct}%</span>
						</div>
					</div>
				</div>
			</div>

			<div className="harvestSectionTitle">Pond insights</div>
			<div className="harvestPondRow">
				{pondIds.map((pid) => {
					const r = byPond(pid)
					const f = feedByPond(pid)
					const fw = f?.average_weight ?? 0
					const bio = f ? (f.shrimp_count * f.average_weight) / 1000 : 0
					const st = pondStatus(r ?? { pond_id: pid, available: false }, fw, targetG)
					const conf = r ? aiConfidence(r) : 0
					return (
						<div key={pid} className="harvestPondCard panel">
							<div className="harvestPondCardTop">
								<span className="harvestPondName">Pond {pid}</span>
								<span className="harvestPondBadge" style={{ background: `${st.color}22`, color: st.color }}>
									{st.label}
								</span>
							</div>
							<ul className="harvestPondStats">
								<li>
									<span className="muted">Current size</span>
									<strong>{formatNumber(fw, { maximumFractionDigits: 1 })} g</strong>
								</li>
								<li>
									<span className="muted">Biomass</span>
									<strong>{formatNumber(bio, { maximumFractionDigits: 1 })} kg</strong>
								</li>
								<li>
									<span className="muted">Days to harvest</span>
									<strong>{r?.available ? r.days_to_harvest ?? '—' : '—'}</strong>
								</li>
								<li>
									<span className="muted">Expected yield</span>
									<strong>
										{r?.available ? formatNumber(r.expected_biomass_kg ?? 0, { maximumFractionDigits: 0 }) : '—'} kg
									</strong>
								</li>
							</ul>
							<div className="harvestConfBar">
								<div className="muted" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
									Model confidence
								</div>
								<div className="harvestConfTrack">
									<div className="harvestConfFill" style={{ width: `${conf}%`, background: st.color }} />
								</div>
								<div className="harvestConfPct">{conf}%</div>
							</div>
						</div>
					)
				})}
			</div>

			<div className="harvestSectionTitle">AI recommendations</div>
			<div className="harvestRecs panel">
				{uniqueRecs.map((rec, i) => (
					<div
						key={i}
						className={`harvestRecRow harvestRec-${rec.tone}`}
					>
						<strong>Pond {rec.pond}</strong>
						<span>{rec.text}</span>
					</div>
				))}
			</div>

			<div className="harvestChartsRow">
				<div className="panel harvestChartPanel">
					<div className="harvestChartTitle">Shrimp growth over time (g)</div>
					<div className="harvestChartBox">
						<Line data={growthLineData as never} options={chartOpts as never} />
					</div>
					<div className="muted harvestChartFoot">Days of culture (0–{maxHorizon - 1}); one series per pond when ML data exists.</div>
				</div>
				<div className="panel harvestChartPanel">
					<div className="harvestChartTitle">Predicted yield by pond (kg)</div>
					<div className="harvestChartBox">
						<Bar data={yieldBarData as never} options={barOpts as never} />
					</div>
				</div>
			</div>

			<div className="harvestBottomRow">
				<div className="panel harvestChartPanel spanBiomass">
					<div className="harvestChartTitle">Biomass accumulation (total kg)</div>
					<div className="harvestChartBox harvestChartBoxTall">
						{anyBiomass ? (
							<Line data={biomassAreaData as never} options={chartOpts as never} />
						) : (
							<div className="emptyState" style={{ minHeight: 200 }}>
								ML biomass curves appear when ponds return growth forecasts.
							</div>
						)}
					</div>
				</div>
				<div className="panel harvestRiskPanel">
					<div className="harvestChartTitle">Risk indicators</div>
					<ul className="harvestRiskList">
						{risks.length === 0 ? (
							<li className="muted">No elevated risks from current water + ML flags.</li>
						) : (
							risks.map((x, i) => (
								<li key={i} className={x.bad ? 'harvestRiskBad' : ''}>
									<span className="harvestRiskLabel">{x.label}</span>
									<span className="muted">
										{x.pond} — {x.status}
									</span>
								</li>
							))
						)}
					</ul>
					<div className="harvestRiskFooter">
						<div>
							<div className="muted tiny">Active flags</div>
							<div className="harvestRiskStat">{risks.length}</div>
						</div>
						<div>
							<div className="muted tiny">Critical</div>
							<div className="harvestRiskStat" style={{ color: criticalAlerts ? 'var(--bad)' : undefined }}>
								{criticalAlerts}
							</div>
						</div>
						<div>
							<div className="muted tiny">Mitigation focus</div>
							<div className="harvestRiskStat">Review DO & temp</div>
						</div>
					</div>
				</div>
			</div>

			<div className="harvestPageFooter">
				<span className="muted">
					Last updated:{' '}
					{harvestMl.lastUpdatedAt
						? formatDateTime(harvestMl.lastUpdatedAt.toISOString())
						: harvestMl.data?.timestamp
							? formatDateTime(harvestMl.data.timestamp)
							: '—'}
				</span>
				<span className="muted">Harvest ML: XGBoost · Target {targetG} g · Horizon {harvestMl.data?.horizon_days ?? 90}d</span>
			</div>
		</div>
	)
}
