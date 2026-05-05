import { useMemo, useState } from 'react'
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
type FeedRow = DashboardApiResponse['feed'][number]
type WaterRow = DashboardApiResponse['water_quality'][number]
type PondScope = 'all' | number

type ScenarioState = {
	enabled: boolean
	pondScope: PondScope
	targetWeightG: number
	feedAdjustPct: number
	feedingFrequencyDelta: number
	doDelta: number
	tempDelta: number
	ammoniaDelta: number
	salinityDelta: number
}

type Recommendation = {
	pond: number
	tone: 'good' | 'warn' | 'info'
	text: string
}

type RiskItem = {
	label: string
	pond: string
	status: string
	bad?: boolean
}

type HarvestSummary = {
	availableRows: HarvestMlPondResult[]
	earliestHarvest: Date | null
	daysToHarvestMin: number | null
	totalYieldKg: number
	avgWeightG: number
	growthRateDay: number
	readinessPct: number
	recs: Recommendation[]
	risks: RiskItem[]
	criticalAlerts: number
}

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
const TARGET_TEMP_C = 29
const TARGET_SALINITY_PPT = 15

type Props = {
	data: DashboardApiResponse
	harvestMl: HarvestMlBundle
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2): number {
	const factor = 10 ** digits
	return Math.round(value * factor) / factor
}

function createDefaultScenario(targetWeightG: number): ScenarioState {
	return {
		enabled: false,
		pondScope: 'all',
		targetWeightG,
		feedAdjustPct: 0,
		feedingFrequencyDelta: 0,
		doDelta: 0,
		tempDelta: 0,
		ammoniaDelta: 0,
		salinityDelta: 0
	}
}

function isoDateFromNow(daysFromNow: number): string {
	const dt = new Date()
	dt.setHours(0, 0, 0, 0)
	dt.setDate(dt.getDate() + daysFromNow)
	return dt.toISOString().slice(0, 10)
}

function dateFromIso(value?: string): Date | null {
	if (!value) return null
	const dt = new Date(value)
	return Number.isNaN(dt.getTime()) ? null : dt
}

function formatDateShort(value: Date | null): string {
	return value ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

function formatSignedNumber(value: number, suffix = ''): string {
	if (!Number.isFinite(value) || Math.abs(value) < 1e-6) return `0${suffix}`
	return `${value > 0 ? '+' : ''}${formatNumber(value, { maximumFractionDigits: 1 })}${suffix}`
}

function formatSignedDays(value: number | null): string {
	if (value == null || value === 0) return 'No change'
	return value > 0 ? `${value} days later` : `${Math.abs(value)} days earlier`
}

function averageRiskProbability(rows: HarvestMlPondResult[]): number {
	const probs = rows.filter((row) => row.available).map((row) => row.early_harvest?.probability ?? 0)
	if (!probs.length) return 0
	return probs.reduce((sum, value) => sum + value, 0) / probs.length
}

function buildHarvestSummary({
	pondIds,
	rows,
	targetG,
	feedMap,
	waterMap
}: {
	pondIds: number[]
	rows: HarvestMlPondResult[]
	targetG: number
	feedMap: Map<number, FeedRow>
	waterMap: Map<number, WaterRow>
}): HarvestSummary {
	const byPond = new Map(rows.map((row) => [row.pond_id, row]))
	const availableRows = rows.filter((row) => row.available)

	let earliestHarvest: Date | null = null
	for (const row of availableRows) {
		const dt = dateFromIso(row.predicted_harvest_start)
		if (dt && (!earliestHarvest || dt < earliestHarvest)) earliestHarvest = dt
	}

	const now = new Date()
	const daysToHarvestMin =
		earliestHarvest != null ? Math.max(0, Math.ceil((earliestHarvest.getTime() - now.getTime()) / 86400000)) : null

	const totalYieldKg = availableRows.reduce((sum, row) => sum + (row.expected_biomass_kg ?? 0), 0)
	const avgWeightG =
		pondIds.length > 0
			? pondIds.reduce((sum, pondId) => sum + (feedMap.get(pondId)?.average_weight ?? 0), 0) / pondIds.length
			: 0

	const growthRates = availableRows
		.filter((row) => (row.growth_forecast?.length ?? 0) >= 2)
		.map((row) => {
			const points = row.growth_forecast!
			return (points[points.length - 1].avg_weight_g - points[0].avg_weight_g) / Math.max(1, points.length - 1)
		})

	const growthRateDay =
		growthRates.length > 0 ? growthRates.reduce((sum, value) => sum + value, 0) / growthRates.length : 0.35

	const readinessPct = Math.min(
		100,
		Math.round((avgWeightG / Math.max(1, targetG)) * 100 * 0.85 + (availableRows.length ? 15 : 0))
	)

	const recs: Recommendation[] = []
	for (const pondId of pondIds) {
		const row = byPond.get(pondId)
		const water = waterMap.get(pondId)
		if (row?.available) {
			if (row.days_to_harvest != null && row.days_to_harvest <= 5) {
				recs.push({
					pond: pondId,
					tone: 'good',
					text: `Prepare harvest equipment — pond ${pondId} is within ~${row.days_to_harvest} days of the model window.`
				})
			} else if (row.early_harvest?.risk) {
				recs.push({
					pond: pondId,
					tone: 'warn',
					text: `Early harvest risk (${formatNumber((row.early_harvest.probability ?? 0) * 100, { maximumFractionDigits: 0 })}%) — review ${(row.early_harvest.reason_codes ?? []).join(', ') || 'conditions'}.`
				})
			} else if ((row.days_to_harvest ?? 0) > 14) {
				recs.push({
					pond: pondId,
					tone: 'info',
					text: `Growth runway remains — consider feed and water tuning to reach target ~${targetG} g.`
				})
			} else {
				recs.push({
					pond: pondId,
					tone: 'good',
					text: 'Trajectory stable; continue monitoring until harvest window.'
				})
			}
		} else {
			recs.push({
				pond: pondId,
				tone: 'info',
				text: `No Mongo-backed ML row for pond ${pondId}. Ingest latest water + feed readings for predictions.`
			})
		}

		if (water && water.dissolved_oxygen < 5) {
			recs.push({
				pond: pondId,
				tone: 'warn',
				text: `Dissolved oxygen is low (${formatNumber(water.dissolved_oxygen, { maximumFractionDigits: 1 })} mg/L) — aeration check.`
			})
		}
	}

	const risks: RiskItem[] = []
	for (const pondId of pondIds) {
		const water = waterMap.get(pondId)
		if (!water) continue
		if (water.dissolved_oxygen < 5.5) {
			risks.push({
				label: 'Dissolved oxygen',
				pond: `Pond ${pondId}`,
				status: water.dissolved_oxygen < 4.5 ? 'Below threshold' : 'Fluctuating / watch',
				bad: water.dissolved_oxygen < 4.5
			})
		}
		if (water.temperature < 26 || water.temperature > 32) {
			risks.push({
				label: 'Temperature',
				pond: `Pond ${pondId}`,
				status: water.temperature < 26 ? 'Lower band' : 'Upper band',
				bad: water.temperature > 31.5
			})
		}
	}

	for (const row of availableRows) {
		if (row.early_harvest?.risk) {
			risks.push({
				label: 'Early harvest (ML)',
				pond: `Pond ${row.pond_id}`,
				status: `${formatNumber((row.early_harvest.probability ?? 0) * 100, { maximumFractionDigits: 0 })}%`,
				bad: true
			})
		}
	}

	return {
		availableRows,
		earliestHarvest,
		daysToHarvestMin,
		totalYieldKg,
		avgWeightG,
		growthRateDay,
		readinessPct,
		recs: recs.slice(0, 6),
		risks,
		criticalAlerts: risks.filter((risk) => risk.bad).length
	}
}

function simulateHarvestRow({
	row,
	water,
	baseTargetG,
	scenario,
	affected
}: {
	row: HarvestMlPondResult
	water?: WaterRow
	baseTargetG: number
	scenario: ScenarioState
	affected: boolean
}): HarvestMlPondResult {
	if (!row.available || !affected) return row

	const baseDays = row.days_to_harvest ?? 21
	const baseRisk = row.early_harvest?.probability ?? 0.18
	const waterDo = water?.dissolved_oxygen ?? 5.6
	const waterTemp = water?.temperature ?? TARGET_TEMP_C
	const waterAmmonia = water?.ammonia ?? 0.12
	const waterSalinity = water?.salinity ?? TARGET_SALINITY_PPT

	const nextDo = Math.max(0, waterDo + scenario.doDelta)
	const nextTemp = waterTemp + scenario.tempDelta
	const nextAmmonia = Math.max(0, waterAmmonia + scenario.ammoniaDelta)
	const nextSalinity = Math.max(0, waterSalinity + scenario.salinityDelta)

	const baselineTempVariance = Math.abs(waterTemp - TARGET_TEMP_C)
	const nextTempVariance = Math.abs(nextTemp - TARGET_TEMP_C)
	const baselineSalinityVariance = Math.abs(waterSalinity - TARGET_SALINITY_PPT)
	const nextSalinityVariance = Math.abs(nextSalinity - TARGET_SALINITY_PPT)

	const targetDelta = scenario.targetWeightG - (row.target_weight_g ?? baseTargetG)
	const tempPenalty = Math.max(0, nextTempVariance - baselineTempVariance) * 1.2
	const salinityPenalty = Math.max(0, nextSalinityVariance - baselineSalinityVariance) * 0.45
	const ammoniaPenalty = Math.max(0, nextAmmonia - waterAmmonia) * 18

	const growthScore =
		scenario.feedAdjustPct * 0.07 +
		scenario.feedingFrequencyDelta * 0.75 +
		scenario.doDelta * 1.4 -
		tempPenalty -
		salinityPenalty -
		ammoniaPenalty

	const simulatedDays = clamp(Math.round(baseDays + targetDelta * 1.7 - growthScore), 3, 180)
	const yieldFactor = clamp(
		1 +
			targetDelta * 0.015 +
			scenario.feedAdjustPct * 0.004 +
			scenario.feedingFrequencyDelta * 0.025 +
			scenario.doDelta * 0.028 -
			tempPenalty * 0.02 -
			Math.max(0, nextAmmonia - waterAmmonia) * 0.45 -
			salinityPenalty * 0.03,
		0.65,
		1.45
	)

	const simulatedRisk = clamp(
		baseRisk -
			scenario.doDelta * 0.04 +
			Math.max(0, nextTempVariance - baselineTempVariance) * 0.055 +
			Math.max(0, nextAmmonia - waterAmmonia) * 1.15 +
			Math.max(0, targetDelta) * 0.008,
		0.02,
		0.98
	)

	const reasonCodes = new Set(row.early_harvest?.reason_codes ?? [])
	if (simulatedRisk >= 0.5) reasonCodes.add('scenario_elevated_early_harvest_risk')
	if (nextDo < 5) reasonCodes.add('low_dissolved_oxygen')
	if (nextAmmonia > 0.18) reasonCodes.add('elevated_ammonia')
	if (nextTemp > 31.5) reasonCodes.add('high_temperature')
	if (nextTemp < 26) reasonCodes.add('low_temperature')

	const growthFactor = clamp(
		1 +
			scenario.feedAdjustPct * 0.0025 +
			scenario.feedingFrequencyDelta * 0.018 +
			scenario.doDelta * 0.03 -
			tempPenalty * 0.015 -
			Math.max(0, nextAmmonia - waterAmmonia) * 0.3 -
			salinityPenalty * 0.02,
		0.78,
		1.25
	)

	const targetFactor = clamp(1 + targetDelta * 0.012, 0.82, 1.2)
	const growthForecast =
		row.growth_forecast?.map((point, index, points) => {
			const progress = (index + 1) / Math.max(1, points.length)
			const weight = clamp(
				point.avg_weight_g * (1 + (growthFactor - 1) * progress) * (1 + (targetFactor - 1) * progress * 0.65),
				0.5,
				scenario.targetWeightG + 3
			)
			const biomass = Math.max(0, point.biomass_kg * (1 + (yieldFactor - 1) * progress))
			return {
				day: point.day,
				avg_weight_g: round(weight, 4),
				biomass_kg: round(biomass, 4)
			}
		}) ?? row.growth_forecast

	return {
		...row,
		target_weight_g: scenario.targetWeightG,
		days_to_harvest: simulatedDays,
		predicted_harvest_start: isoDateFromNow(simulatedDays),
		predicted_harvest_end: isoDateFromNow(simulatedDays + 10),
		expected_biomass_kg: round((row.expected_biomass_kg ?? 0) * yieldFactor, 4),
		early_harvest: {
			risk: simulatedRisk >= 0.5,
			probability: round(simulatedRisk, 4),
			reason_codes: Array.from(reasonCodes)
		},
		growth_forecast: growthForecast
	}
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
	const [scenario, setScenario] = useState<ScenarioState>(() => createDefaultScenario(targetG))
	const baseRows = harvestMl.data?.ponds ?? []
	const mlActive = harvestMl.data?.source === 'xgboost' && baseRows.some((r) => r.available)

	const feedMap = useMemo(() => new Map(data.feed.map((feed) => [feed.pond_id, feed])), [data.feed])
	const waterMap = useMemo(() => new Map(data.water_quality.map((water) => [water.pond_id, water])), [data.water_quality])
	const byPond = (rows: HarvestMlPondResult[], id: number) => rows.find((row) => row.pond_id === id)
	const feedByPond = (pid: number) => feedMap.get(pid)

	const scenarioEnabled = scenario.enabled && mlActive
	const affectedPondCount = scenario.pondScope === 'all' ? pondIds.length : 1

	const displayWaterMap = useMemo(() => {
		const next = new Map<number, WaterRow>()
		for (const pondId of pondIds) {
			const water = waterMap.get(pondId)
			if (!water) continue
			const affected = scenarioEnabled && (scenario.pondScope === 'all' || scenario.pondScope === pondId)
			next.set(
				pondId,
				affected
					? {
							...water,
							dissolved_oxygen: Math.max(0, water.dissolved_oxygen + scenario.doDelta),
							temperature: water.temperature + scenario.tempDelta,
							ammonia: Math.max(0, water.ammonia + scenario.ammoniaDelta),
							salinity: Math.max(0, water.salinity + scenario.salinityDelta)
					  }
					: water
			)
		}
		return next
	}, [pondIds, scenario, scenarioEnabled, waterMap])

	const simulatedRows = useMemo(
		() =>
			baseRows.map((row) =>
				simulateHarvestRow({
					row,
					water: waterMap.get(row.pond_id),
					baseTargetG: targetG,
					scenario,
					affected: scenarioEnabled && (scenario.pondScope === 'all' || scenario.pondScope === row.pond_id)
				})
			),
		[baseRows, feedMap, scenario, scenarioEnabled, targetG, waterMap]
	)

	const displayRows = scenarioEnabled ? simulatedRows : baseRows
	const displayTargetG = scenarioEnabled ? scenario.targetWeightG : targetG
	const baseSummary = useMemo(
		() => buildHarvestSummary({ pondIds, rows: baseRows, targetG, feedMap, waterMap }),
		[baseRows, feedMap, pondIds, targetG, waterMap]
	)
	const displaySummary = useMemo(
		() => buildHarvestSummary({ pondIds, rows: displayRows, targetG: displayTargetG, feedMap, waterMap: displayWaterMap }),
		[displayRows, displayTargetG, displayWaterMap, feedMap, pondIds]
	)

	const maxHorizon = Math.max(
		30,
		...baseRows.map((row) => row.growth_forecast?.length ?? 0),
		...displayRows.map((row) => row.growth_forecast?.length ?? 0)
	)

	const growthLineData = {
		labels: Array.from({ length: maxHorizon }, (_, i) => i),
		datasets: [
			...pondIds.map((pid, idx) => {
				const r = byPond(baseRows, pid)
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
			}),
			...(scenarioEnabled
				? pondIds
						.filter((pid) => scenario.pondScope === 'all' || scenario.pondScope === pid)
						.map((pid, idx) => {
							const r = byPond(displayRows, pid)
							const pts =
								r?.available && r.growth_forecast?.length
									? r.growth_forecast.map((p) => p.avg_weight_g)
									: []
							const padded = Array.from({ length: maxHorizon }, (_, i) => pts[i] ?? null)
							const c = POND_LINE_COLORS[idx % POND_LINE_COLORS.length]
							return {
								label: `Pond ${pid} (scenario)`,
								data: padded,
								borderColor: c.border,
								backgroundColor: c.fill,
								fill: false,
								tension: 0.35,
								spanGaps: false,
								borderDash: [6, 4],
								borderWidth: 2,
								pointRadius: 0
							}
						})
				: [])
		]
	}

	const yieldBarData = {
		labels: pondIds.map((p) => `Pond ${p}`),
		datasets: [
			{
				label: 'Expected yield (kg)',
				data: pondIds.map((pid) => {
					const r = byPond(baseRows, pid)
					return r?.available ? r.expected_biomass_kg ?? 0 : 0
				}),
				backgroundColor: pondIds.map((_, i) => POND_LINE_COLORS[i % POND_LINE_COLORS.length].border),
				borderRadius: 6
			},
			...(scenarioEnabled
				? [
						{
							label: 'Scenario yield (kg)',
							data: pondIds.map((pid) => {
								const r = byPond(displayRows, pid)
								return r?.available ? r.expected_biomass_kg ?? 0 : 0
							}),
							backgroundColor: pondIds.map((_, i) => `${POND_LINE_COLORS[i % POND_LINE_COLORS.length].border}55`),
							borderColor: pondIds.map((_, i) => POND_LINE_COLORS[i % POND_LINE_COLORS.length].border),
							borderWidth: 1,
							borderRadius: 6
						}
				  ]
				: [])
		]
	}

	const baseBiomassByDay: number[] = Array.from({ length: maxHorizon }, () => 0)
	const displayBiomassByDay: number[] = Array.from({ length: maxHorizon }, () => 0)
	let anyBiomass = false
	for (const pid of pondIds) {
		const baseRow = byPond(baseRows, pid)
		if (baseRow?.available && baseRow.growth_forecast?.length) {
			anyBiomass = true
			baseRow.growth_forecast.forEach((pt, i) => {
				if (i < maxHorizon) baseBiomassByDay[i] += pt.biomass_kg
			})
		}
		const displayRow = byPond(displayRows, pid)
		if (displayRow?.available && displayRow.growth_forecast?.length) {
			displayRow.growth_forecast.forEach((pt, i) => {
				if (i < maxHorizon) displayBiomassByDay[i] += pt.biomass_kg
			})
		}
	}

	const biomassAreaData = {
		labels: Array.from({ length: maxHorizon }, (_, i) => i),
		datasets: [
			{
				label: 'Total biomass (kg)',
				data: baseBiomassByDay,
				borderColor: '#0f766e',
				backgroundColor: 'rgba(15, 118, 110, 0.2)',
				fill: true,
				tension: 0.4,
				pointRadius: 0
			},
			...(scenarioEnabled
				? [
						{
							label: 'Scenario biomass (kg)',
							data: displayBiomassByDay,
							borderColor: '#7c3aed',
							backgroundColor: 'rgba(124, 58, 237, 0.08)',
							fill: false,
							tension: 0.4,
							pointRadius: 0,
							borderDash: [6, 4]
						}
				  ]
				: [])
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
		plugins: { legend: { display: true, position: 'bottom' } },
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17,24,39,0.08)' }, beginAtZero: true }
		}
	}

	const scopeLabel = scenario.pondScope === 'all' ? 'All ponds' : `Pond ${scenario.pondScope}`
	const scenarioAverageRisk = averageRiskProbability(displayRows)
	const baselineAverageRisk = averageRiskProbability(baseRows)
	const apiRecommendations =
		harvestMl.data?.ai_recommendations?.filter((rec) => rec.text && ['good', 'warn', 'info'].includes(rec.tone)) ?? []
	const displayedRecommendations = scenarioEnabled
		? displaySummary.recs
		: apiRecommendations.length > 0
			? apiRecommendations
			: displaySummary.recs

	const updateScenario = <K extends keyof ScenarioState>(key: K, value: ScenarioState[K]) => {
		setScenario((prev) => ({ ...prev, [key]: value }))
	}

	const resetScenario = () => setScenario(createDefaultScenario(targetG))

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

			<div className="panel harvestSimulatorPanel">
				<div className="harvestSimulatorHeader">
					<div>
						<div className="harvestSectionTitle" style={{ marginBottom: 6 }}>What-if simulator</div>
						<div className="muted" style={{ fontSize: '0.85rem' }}>
							Test feed and water changes against the current harvest ML output before changing real operations.
						</div>
					</div>
					<div className="harvestSimulatorActions">
						<label className="harvestToggle">
							<input
								type="checkbox"
								checked={scenario.enabled}
								onChange={(event) => updateScenario('enabled', event.target.checked)}
								disabled={!mlActive}
							/>
							<span>Enable scenario</span>
						</label>
						<button type="button" onClick={resetScenario}>
							Reset
						</button>
					</div>
				</div>

				<div className="harvestSimulatorGrid">
					<label className="harvestField">
						<span>Pond scope</span>
						<select
							value={scenario.pondScope === 'all' ? 'all' : String(scenario.pondScope)}
							onChange={(event) =>
								updateScenario('pondScope', event.target.value === 'all' ? 'all' : Number(event.target.value))
							}
							disabled={!mlActive}
						>
							<option value="all">All ponds</option>
							{pondIds.map((pondId) => (
								<option key={pondId} value={pondId}>
									Pond {pondId}
								</option>
							))}
						</select>
					</label>
					<label className="harvestField">
						<span>Target harvest weight (g)</span>
						<input
							type="number"
							min={12}
							max={40}
							step={0.5}
							value={scenario.targetWeightG}
							onChange={(event) => updateScenario('targetWeightG', Number(event.target.value) || targetG)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Feed adjustment (%)</span>
						<input
							type="number"
							min={-30}
							max={30}
							step={5}
							value={scenario.feedAdjustPct}
							onChange={(event) => updateScenario('feedAdjustPct', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Feeding frequency delta</span>
						<input
							type="number"
							min={-2}
							max={2}
							step={1}
							value={scenario.feedingFrequencyDelta}
							onChange={(event) => updateScenario('feedingFrequencyDelta', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Dissolved oxygen delta (mg/L)</span>
						<input
							type="number"
							min={-2}
							max={2}
							step={0.25}
							value={scenario.doDelta}
							onChange={(event) => updateScenario('doDelta', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Temperature delta (C)</span>
						<input
							type="number"
							min={-4}
							max={4}
							step={0.5}
							value={scenario.tempDelta}
							onChange={(event) => updateScenario('tempDelta', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Ammonia delta (mg/L)</span>
						<input
							type="number"
							min={-0.2}
							max={0.2}
							step={0.02}
							value={scenario.ammoniaDelta}
							onChange={(event) => updateScenario('ammoniaDelta', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
					<label className="harvestField">
						<span>Salinity delta (ppt)</span>
						<input
							type="number"
							min={-5}
							max={5}
							step={0.5}
							value={scenario.salinityDelta}
							onChange={(event) => updateScenario('salinityDelta', Number(event.target.value) || 0)}
							disabled={!mlActive}
						/>
					</label>
				</div>

				<div className="harvestScenarioSummary">
					<div className="harvestScenarioCard">
						<div className="muted tiny">Scope</div>
						<div className="harvestScenarioValue">{scopeLabel}</div>
						<div className="harvestScenarioHint">{affectedPondCount} pond(s) affected</div>
					</div>
					<div className="harvestScenarioCard">
						<div className="muted tiny">Harvest timing</div>
						<div className="harvestScenarioValue">
							{formatDateShort(baseSummary.earliestHarvest)} {scenarioEnabled ? `-> ${formatDateShort(displaySummary.earliestHarvest)}` : ''}
						</div>
						<div className="harvestScenarioHint">
							{scenarioEnabled
								? formatSignedDays(
										(displaySummary.daysToHarvestMin ?? 0) - (baseSummary.daysToHarvestMin ?? 0)
								  )
								: 'Baseline model window'}
						</div>
					</div>
					<div className="harvestScenarioCard">
						<div className="muted tiny">Predicted yield</div>
						<div className="harvestScenarioValue">
							{formatNumber(baseSummary.totalYieldKg, { maximumFractionDigits: 0 })} kg
							{scenarioEnabled ? ` -> ${formatNumber(displaySummary.totalYieldKg, { maximumFractionDigits: 0 })} kg` : ''}
						</div>
						<div className="harvestScenarioHint">
							{scenarioEnabled
								? `${formatSignedNumber(displaySummary.totalYieldKg - baseSummary.totalYieldKg, ' kg')} vs baseline`
								: 'Sum of expected biomass'}
						</div>
					</div>
					<div className="harvestScenarioCard">
						<div className="muted tiny">Average risk</div>
						<div className="harvestScenarioValue">
							{formatNumber(baselineAverageRisk * 100, { maximumFractionDigits: 1 })}%
							{scenarioEnabled ? ` -> ${formatNumber(scenarioAverageRisk * 100, { maximumFractionDigits: 1 })}%` : ''}
						</div>
						<div className="harvestScenarioHint">
							{scenarioEnabled
								? `${formatSignedNumber((scenarioAverageRisk - baselineAverageRisk) * 100, ' pts')} early-harvest probability`
								: 'Average across available ML rows'}
						</div>
					</div>
				</div>
			</div>

			<div className="harvestKpiRow">
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Estimated harvest</div>
					<div className="harvestKpiValue">{formatDateShort(displaySummary.earliestHarvest)}</div>
					<div className="harvestKpiHint">
						{displaySummary.daysToHarvestMin != null
							? `${displaySummary.daysToHarvestMin} days remaining (earliest pond)`
							: 'Load ML + Mongo readings'}
						{scenarioEnabled ? ` · ${formatSignedDays((displaySummary.daysToHarvestMin ?? 0) - (baseSummary.daysToHarvestMin ?? 0))}` : ''}
					</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Predicted total yield</div>
					<div className="harvestKpiValue">{formatNumber(displaySummary.totalYieldKg, { maximumFractionDigits: 0 })} kg</div>
					<div className="harvestKpiHint">
						Sum of expected biomass (ML)
						{scenarioEnabled ? ` · ${formatSignedNumber(displaySummary.totalYieldKg - baseSummary.totalYieldKg, ' kg')}` : ''}
					</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Average shrimp weight</div>
					<div className="harvestKpiValue">{formatNumber(displaySummary.avgWeightG, { maximumFractionDigits: 1 })} g</div>
					<div className="harvestKpiHint">Live dashboard feed average</div>
				</div>
				<div className="harvestKpiCard panel">
					<div className="muted harvestKpiLabel">Growth rate</div>
					<div className="harvestKpiValue">{formatNumber(displaySummary.growthRateDay, { maximumFractionDigits: 2 })} g/day</div>
					<div className="harvestKpiHint">
						{mlActive ? 'From ML trajectory' : 'Approximate'}
						{scenarioEnabled ? ` · ${formatSignedNumber(displaySummary.growthRateDay - baseSummary.growthRateDay, ' g/day')}` : ''}
					</div>
				</div>
				<div className="harvestKpiCard panel harvestKpiGaugeCard">
					<div className="muted harvestKpiLabel">Harvest readiness</div>
					<div className="harvestGaugeWrap" aria-hidden>
						<div
							className="harvestGaugeRing"
							style={{
								background: `conic-gradient(${READY} ${displaySummary.readinessPct}%, rgba(17,24,39,0.08) 0)`
							}}
						/>
						<div className="harvestGaugeInner">
							<span className="harvestGaugePct">{displaySummary.readinessPct}%</span>
						</div>
					</div>
					<div className="harvestKpiHint" style={{ textAlign: 'center' }}>
						{scenarioEnabled ? `${formatSignedNumber(displaySummary.readinessPct - baseSummary.readinessPct, ' pts')} vs baseline` : 'Current target readiness'}
					</div>
				</div>
			</div>

			<div className="harvestSectionTitle">Pond insights</div>
			<div className="harvestPondRow">
				{pondIds.map((pid) => {
					const baseRow = byPond(baseRows, pid)
					const displayRow = byPond(displayRows, pid)
					const f = feedByPond(pid)
					const fw = f?.average_weight ?? 0
					const bio = f ? (f.shrimp_count * f.average_weight) / 1000 : 0
					const st = pondStatus(displayRow ?? { pond_id: pid, available: false }, fw, displayTargetG)
					const conf = displayRow ? aiConfidence(displayRow) : 0
					const affected = scenarioEnabled && (scenario.pondScope === 'all' || scenario.pondScope === pid)
					const dayDelta =
						affected && baseRow?.available && displayRow?.available
							? (displayRow.days_to_harvest ?? 0) - (baseRow.days_to_harvest ?? 0)
							: null
					const yieldDelta =
						affected && baseRow?.available && displayRow?.available
							? (displayRow.expected_biomass_kg ?? 0) - (baseRow.expected_biomass_kg ?? 0)
							: null
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
									<strong>{displayRow?.available ? displayRow.days_to_harvest ?? '—' : '—'}</strong>
								</li>
								<li>
									<span className="muted">Expected yield</span>
									<strong>
										{displayRow?.available ? formatNumber(displayRow.expected_biomass_kg ?? 0, { maximumFractionDigits: 0 }) : '—'} kg
									</strong>
								</li>
							</ul>
							{scenarioEnabled && affected && displayRow?.available ? (
								<div className="harvestPondScenarioMeta">
									<div className="harvestPondScenarioRow">
										<span className="muted">Scenario delta</span>
										<strong>{formatSignedDays(dayDelta)}</strong>
									</div>
									<div className="harvestPondScenarioRow">
										<span className="muted">Yield delta</span>
										<strong>{formatSignedNumber(yieldDelta ?? 0, ' kg')}</strong>
									</div>
								</div>
							) : null}
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

			<div className="harvestSectionTitle">{scenarioEnabled ? 'Scenario recommendations' : 'AI recommendations'}</div>
			<div className="harvestRecs panel">
				{displayedRecommendations.map((rec, i) => (
					<div key={i} className={`harvestRecRow harvestRec-${rec.tone}`}>
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
					<div className="muted harvestChartFoot">
						Days of culture (0–{maxHorizon - 1}); solid lines are baseline and dashed lines show the scenario.
					</div>
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
						{displaySummary.risks.length === 0 ? (
							<li className="muted">No elevated risks from current water + ML flags.</li>
						) : (
							displaySummary.risks.map((x, i) => (
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
							<div className="harvestRiskStat">{displaySummary.risks.length}</div>
							{scenarioEnabled ? (
								<div className="muted" style={{ fontSize: '0.72rem' }}>
									{formatSignedNumber(displaySummary.risks.length - baseSummary.risks.length)}
								</div>
							) : null}
						</div>
						<div>
							<div className="muted tiny">Critical</div>
							<div className="harvestRiskStat" style={{ color: displaySummary.criticalAlerts ? 'var(--bad)' : undefined }}>
								{displaySummary.criticalAlerts}
							</div>
							{scenarioEnabled ? (
								<div className="muted" style={{ fontSize: '0.72rem' }}>
									{formatSignedNumber(displaySummary.criticalAlerts - baseSummary.criticalAlerts)}
								</div>
							) : null}
						</div>
						<div>
							<div className="muted tiny">Mitigation focus</div>
							<div className="harvestRiskStat">{scenarioEnabled ? 'Scenario conditions' : 'Review DO & temp'}</div>
							{scenarioEnabled ? (
								<div className="muted" style={{ fontSize: '0.72rem' }}>
									Target {formatNumber(scenario.targetWeightG, { maximumFractionDigits: 1 })} g
								</div>
							) : null}
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
				<span className="muted">
					Harvest ML: XGBoost · Target {displayTargetG} g · Horizon {harvestMl.data?.horizon_days ?? 90}d
				</span>
			</div>
		</div>
	)
}
