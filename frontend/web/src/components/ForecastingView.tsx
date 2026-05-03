import { Line } from 'react-chartjs-2'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatCurrencyLkr, formatNumber, formatDateTime } from '../lib/format'
import { useForecastsData } from '../lib/useForecastsData'
import { useHarvestMlData } from '../lib/useHarvestMlData'

type HarvestMlBundle = ReturnType<typeof useHarvestMlData>

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
	harvestMl: HarvestMlBundle
}

export function ForecastingView({ data, history, pondFilter, harvestMl }: Props) {
	const { dashboard } = data
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const energy = pondFilter ? data.energy.filter((e) => e.pond_id === pondFilter) : data.energy

	// Fetch AI-generated forecasts
	const { data: forecastsData, loading: forecastsLoading, error: forecastsError } = useForecastsData({
		ponds: Math.max(1, data.water_quality.length),
		forecastDays: 90
	})

	// Calculate current metrics from real-time data
	const currentWeight = feed.length > 0 ? feed.reduce((sum, f) => sum + f.average_weight, 0) / feed.length : 10
	const totalBiomassKg = feed.reduce((sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000, 0)
	const estimatedHarvestYieldTons = totalBiomassKg / 1000

	const economicSettings = data.economic_settings
	const shrimpPricePerKg = economicSettings?.shrimp_price_per_kg_lkr ?? 2000
	const feedCostPerKg = economicSettings?.feed_cost_per_kg_lkr ?? 400
	const totalEnergyCost = energy.reduce((sum, e) => sum + e.cost, 0)
	const totalFeedKg = feed.reduce((sum, f) => f.feed_amount, 0) / 1000
	const totalFeedCost = totalFeedKg * feedCostPerKg
	const projectedProfit = totalBiomassKg * shrimpPricePerKg - totalFeedCost - totalEnergyCost

	// Use AI forecasts if available, otherwise fall back to calculated values
	const forecasts = forecastsData?.forecasts
	const harvestWindow = forecasts?.harvest_window
	const aiPredictions = forecasts?.ai_predictions || []

	// Extract forecast data
	const growthForecast = forecasts?.growth_forecast || []
	const waterQualityForecast = forecasts?.water_quality_forecast || []
	const diseaseRiskForecast = forecasts?.disease_risk_forecast || []
	const profitForecast = forecasts?.profit_forecast || []

	// Calculate harvest window from AI forecast or fallback
	let harvestWindowStr = 'N/A'
	let fcr = 1.3
	if (harvestWindow) {
		const startDate = new Date(harvestWindow.optimal_start)
		const endDate = new Date(harvestWindow.optimal_end)
		harvestWindowStr = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
		fcr = harvestWindow.fcr || 1.3
	} else {
		// Fallback calculation
		const historyFiltered = history.map((snap) => ({
			...snap,
			feed: pondFilter ? snap.feed.filter((f) => f.pond_id === pondFilter) : snap.feed
		}))
		const historyAvgWeight = historyFiltered.map((h) => {
			const weights = h.feed.map((f) => f.average_weight)
			return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
		})
		const growthRate = historyAvgWeight.length >= 2
			? (historyAvgWeight[historyAvgWeight.length - 1] - historyAvgWeight[historyAvgWeight.length - 2]) / 7
			: 0.5
		const targetWeight = 22
		const daysToHarvest = Math.max(10, Math.min(60, Math.round((targetWeight - currentWeight) / (growthRate * 7))))
		const harvestDate = new Date()
		harvestDate.setDate(harvestDate.getDate() + daysToHarvest)
		const harvestEndDate = new Date(harvestDate)
		harvestEndDate.setDate(harvestEndDate.getDate() + 10)
		harvestWindowStr = `${harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${harvestEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
	}

	// Prepare chart data from AI forecasts
	let forecastedWeight = growthForecast.length > 0 ? growthForecast[growthForecast.length - 1].avg_weight_g || currentWeight : currentWeight
	let projectedYieldTons = harvestWindow?.projected_yield_tons || estimatedHarvestYieldTons

	const harvestMlRows =
		harvestMl.data?.ponds?.filter((p) => !pondFilter || p.pond_id === pondFilter) ?? []
	const harvestMlActive =
		harvestMl.data?.source === 'xgboost' && harvestMlRows.some((p) => p.available)
	const primaryHarvestMl = harvestMlRows.find((p) => p.available)
	const mlAvailableRows = harvestMlRows.filter((p) => p.available && p.growth_forecast && p.growth_forecast.length > 0)

	let mlAvgWeightByDay: number[] = []
	let mlSumBiomassByDay: number[] = []
	if (mlAvailableRows.length > 0) {
		const maxLen = Math.max(...mlAvailableRows.map((p) => p.growth_forecast!.length))
		for (let di = 0; di < maxLen; di++) {
			let sw = 0
			let sb = 0
			let c = 0
			for (const p of mlAvailableRows) {
				const g = p.growth_forecast!
				if (di < g.length) {
					sw += g[di].avg_weight_g
					sb += g[di].biomass_kg
					c++
				}
			}
			mlAvgWeightByDay.push(c > 0 ? sw / c : currentWeight)
			mlSumBiomassByDay.push(sb)
		}
	}
	const useMlForForecastCharts = harvestMl.data?.source === 'xgboost' && mlAvgWeightByDay.length > 0

	if (harvestMlActive && primaryHarvestMl?.predicted_harvest_start) {
		const a = new Date(primaryHarvestMl.predicted_harvest_start)
		const b = new Date(primaryHarvestMl.predicted_harvest_end ?? primaryHarvestMl.predicted_harvest_start)
		harvestWindowStr = `${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
	}
	if (useMlForForecastCharts) {
		forecastedWeight = mlAvgWeightByDay[mlAvgWeightByDay.length - 1] ?? forecastedWeight
	} else if (harvestMlActive && primaryHarvestMl?.growth_forecast?.length) {
		const last = primaryHarvestMl.growth_forecast[primaryHarvestMl.growth_forecast.length - 1]
		forecastedWeight = last.avg_weight_g
	}
	if (harvestMlActive && mlAvailableRows.length > 0) {
		const sumExpected = mlAvailableRows.reduce((s, p) => s + (p.expected_biomass_kg ?? 0), 0)
		if (sumExpected > 0) {
			projectedYieldTons = sumExpected / 1000
		}
	} else if (harvestMlActive && primaryHarvestMl?.expected_biomass_kg != null) {
		projectedYieldTons = primaryHarvestMl.expected_biomass_kg / 1000
	}

	const ML_LINE_COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#db2777', '#0891b2']
	const maxMlChartLen =
		mlAvailableRows.length > 0
			? Math.max(...mlAvailableRows.map((p) => p.growth_forecast!.length))
			: 0
	const mlGrowthChart =
		mlAvailableRows.length > 0 && maxMlChartLen > 0
			? {
					labels: Array.from({ length: maxMlChartLen }, (_, i) => `Day ${i + 1}`),
					datasets: mlAvailableRows.map((p, idx) => {
						const pts = p.growth_forecast!.map((g) => g.avg_weight_g)
						const padded: (number | null)[] = [
							...pts,
							...Array(Math.max(0, maxMlChartLen - pts.length)).fill(null)
						]
						const c = ML_LINE_COLORS[idx % ML_LINE_COLORS.length]
						return {
							type: 'line' as const,
							label: `ML weight · pond ${p.pond_id}`,
							data: padded,
							borderColor: c,
							backgroundColor: `${c}14`,
							fill: mlAvailableRows.length === 1,
							tension: 0.25,
							spanGaps: false
						}
					})
			  }
			: null

	const mlRiskPonds = harvestMlRows.filter((p) => p.available && p.early_harvest?.risk)

	// Generate monthly labels for charts
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	const currentMonth = new Date().getMonth()
	const chartMonths = months.slice(Math.max(0, currentMonth - 6), currentMonth + 1)
	// Wrap past December: slice(12, …) is empty in Dec, which hid all AI forecast series.
	const forecastMonths = Array.from({ length: 6 }, (_, i) => months[(currentMonth + 1 + i) % 12])

	// Growth chart - combine historical with AI forecast
	const historyFiltered = history.map((snap) => ({
		...snap,
		feed: pondFilter ? snap.feed.filter((f) => f.pond_id === pondFilter) : snap.feed
	}))
	const historyAvgWeight = historyFiltered.map((h) => {
		const weights = h.feed.map((f) => f.average_weight)
		return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
	})

	// Map AI forecast to monthly buckets. API returns one point per day (e.g. 90 entries = days 1..90
	// at indices 0..89). Using raw (i+1)*30 as an array index overshoots (e.g. 90 < 90 is false)
	// and wrongly fell back to currentWeight for later months — chart cliff to ~10g and profit → 0.
	const monthlyGrowthForecast = forecastMonths.map((_, i) => {
		const targetDay = (i + 1) * 30
		if (useMlForForecastCharts) {
			const idx = Math.min(mlAvgWeightByDay.length - 1, Math.max(0, targetDay - 1))
			return mlAvgWeightByDay[idx] ?? currentWeight
		}
		if (!growthForecast.length) return currentWeight
		const idx = Math.min(growthForecast.length - 1, Math.max(0, targetDay - 1))
		return growthForecast[idx].avg_weight_g || currentWeight
	})

	const histSlice = historyAvgWeight.slice(-chartMonths.length)
	const histMomChange = histSlice.map((w, i) =>
		i > 0 ? w - histSlice[i - 1] : null
	)
	const fcMomChange = monthlyGrowthForecast.map((w, i) =>
		i > 0 ? w - monthlyGrowthForecast[i - 1] : w - currentWeight
	)

	const forecastWeightLineLabel = useMlForForecastCharts
		? 'Harvest ML avg weight (g) · /api/harvest-ml'
		: 'AI forecast avg weight (g) · /api/forecasts'

	const growthChart = {
		labels: [...chartMonths, ...forecastMonths],
		datasets: [
			{
				type: 'line' as const,
				label: 'Historical avg weight (g)',
				data: [...histSlice, ...Array(forecastMonths.length).fill(null)],
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.1)',
				fill: true,
				tension: 0.4,
				yAxisID: 'y'
			},
			{
				type: 'line' as const,
				label: forecastWeightLineLabel,
				data: [...Array(chartMonths.length).fill(null), ...monthlyGrowthForecast],
				borderColor: '#16a34a',
				backgroundColor: 'rgba(22, 163, 74, 0.08)',
				fill: true,
				borderDash: [6, 4],
				tension: 0.4,
				yAxisID: 'y'
			},
			{
				type: 'line' as const,
				label: 'Month-over-month Δ weight (g)',
				data: [...histMomChange, ...fcMomChange],
				borderColor: '#8b5cf6',
				backgroundColor: 'rgba(139, 92, 246, 0.06)',
				fill: false,
				tension: 0.35,
				borderDash: [2, 3],
				spanGaps: true,
				yAxisID: 'y1'
			}
		]
	}

	// Profit chart from AI forecast
	const monthlyProfitForecast = forecastMonths.map((_, i) => {
		const targetDay = (i + 1) * 30
		if (useMlForForecastCharts && mlSumBiomassByDay.length > 0) {
			const idx = Math.min(mlSumBiomassByDay.length - 1, Math.max(0, targetDay - 1))
			const bio = mlSumBiomassByDay[idx] ?? 0
			const feedScale = totalBiomassKg > 1e-6 ? bio / totalBiomassKg : 1
			return Math.max(0, bio * shrimpPricePerKg - totalFeedCost * feedScale - totalEnergyCost)
		}
		if (!profitForecast.length) return 0
		const idx = Math.min(profitForecast.length - 1, Math.max(0, targetDay - 1))
		return profitForecast[idx].profit_lkr || 0
	})

	const profitHistorical = chartMonths.map((_, i) => {
		if (i < historyFiltered.length) {
			const h = historyFiltered[Math.max(0, historyFiltered.length - chartMonths.length + i)]
			const biomassKg = h.feed.reduce((sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000, 0)
			const feedKg = h.feed.reduce((sum, f) => sum + f.feed_amount, 0) / 1000
			return biomassKg * shrimpPricePerKg - feedKg * feedCostPerKg - (totalEnergyCost / chartMonths.length)
		}
		return 0
	})

	const forecastProfitLineLabel = useMlForForecastCharts
		? 'Harvest ML profit est. (LKR) · biomass from /api/harvest-ml'
		: 'AI forecast profit (LKR) · /api/forecasts'

	const profitChart = {
		labels: [...chartMonths, ...forecastMonths],
		datasets: [
			{
				type: 'line' as const,
				label: 'Historical profit (LKR)',
				data: [...profitHistorical, ...Array(forecastMonths.length).fill(null)],
				borderColor: '#16a34a',
				backgroundColor: 'rgba(22, 163, 74, 0.1)',
				fill: true,
				tension: 0.4
			},
			{
				type: 'line' as const,
				label: forecastProfitLineLabel,
				data: [...Array(chartMonths.length).fill(null), ...monthlyProfitForecast],
				borderColor: '#f59e0b',
				backgroundColor: 'rgba(245, 158, 11, 0.1)',
				fill: true,
				borderDash: [6, 4],
				tension: 0.4
			}
		]
	}

	// Water quality forecast from AI
	const waterQualityDays = Array.from({ length: 120 }, (_, i) => {
		const date = new Date()
		date.setDate(date.getDate() + i)
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	})

	const phForecast = waterQualityForecast.length > 0
		? waterQualityForecast.filter((_, i) => i % 10 === 0).map(f => f.ph || 7.8)
		: waterQualityDays.map((_, i) => {
			const seasonal = Math.sin((i / 120) * Math.PI * 2) * 0.3
			const avgPh = water.reduce((sum, w) => sum + w.ph, 0) / water.length || 7.8
			return Math.max(7.2, Math.min(8.5, avgPh + seasonal))
		})

	const doForecast = waterQualityForecast.length > 0
		? waterQualityForecast.filter((_, i) => i % 10 === 0).map(f => f.dissolved_oxygen || 6.0)
		: waterQualityDays.map((_, i) => {
			const seasonal = Math.sin((i / 120) * Math.PI * 2) * 0.5
			const avgDO = water.reduce((sum, w) => sum + w.dissolved_oxygen, 0) / water.length || 6.0
			return Math.max(4.5, Math.min(8.0, avgDO + seasonal))
		})

	const tempForecast = waterQualityForecast.length > 0
		? waterQualityForecast.filter((_, i) => i % 10 === 0).map(f => f.temperature || 28)
		: waterQualityDays.map((_, i) => {
			const trend = (i / 120) * 2
			const seasonal = Math.sin((i / 120) * Math.PI * 2) * 1.5
			const avgTemp = water.reduce((sum, w) => sum + w.temperature, 0) / water.length || 28
			return Math.max(24, Math.min(32, avgTemp + trend + seasonal))
		})

	const waterQualityChart = {
		labels: waterQualityDays.filter((_, i) => i % 10 === 0),
		datasets: [
			{
				label: 'pH',
				data: phForecast,
				borderColor: '#60a5fa',
				backgroundColor: 'rgba(96, 165, 250, 0.1)',
				fill: false,
				tension: 0.4
			},
			{
				label: 'Dissolved Oxygen',
				data: doForecast,
				borderColor: '#22c55e',
				backgroundColor: 'rgba(34, 197, 94, 0.1)',
				fill: false,
				tension: 0.4
			},
			{
				label: 'Temperature',
				data: tempForecast,
				borderColor: '#f59e0b',
				backgroundColor: 'rgba(245, 158, 11, 0.1)',
				fill: true,
				tension: 0.4
			}
		]
	}

	// Disease risk forecast from AI
	const riskDays = Array.from({ length: 90 }, (_, i) => {
		const date = new Date()
		date.setDate(date.getDate() + i)
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	})

	const diseaseRisk = diseaseRiskForecast.length > 0
		? diseaseRiskForecast.filter((_, i) => i % 5 === 0).map(f => (f.risk_level || 0) * 100)
		: riskDays.map((_, i) => {
			const tempRisk = tempForecast[Math.floor(i / 5)] > 30 ? 0.6 : tempForecast[Math.floor(i / 5)] > 28 ? 0.4 : 0.2
			const doRisk = doForecast[Math.floor(i / 5)] < 5 ? 0.4 : 0.1
			const seasonalRisk = Math.sin((i / 90) * Math.PI * 2 + Math.PI / 2) * 0.3 + 0.3
			return Math.min(100, (tempRisk + doRisk + seasonalRisk) * 100)
		})

	const diseaseRiskChart = {
		labels: riskDays.filter((_, i) => i % 5 === 0),
		datasets: [
			{
				type: 'line' as const,
				label: 'Disease / environmental risk (%)',
				data: diseaseRisk,
				borderColor: '#ea580c',
				backgroundColor: 'rgba(234, 88, 12, 0.12)',
				fill: true,
				tension: 0.4,
				pointRadius: 3,
				pointHoverRadius: 5,
				pointBackgroundColor: diseaseRisk.map((r) =>
					r > 60 ? 'rgba(239, 68, 68, 0.95)' : r > 40 ? 'rgba(245, 158, 11, 0.95)' : 'rgba(34, 197, 94, 0.95)'
				),
				pointBorderColor: 'rgba(17, 24, 39, 0.15)',
				pointBorderWidth: 1
			}
		]
	}

	// Get current water quality averages
	const avgPh = water.reduce((sum, w) => sum + w.ph, 0) / water.length || 7.8
	const avgDO = water.reduce((sum, w) => sum + w.dissolved_oxygen, 0) / water.length || 6.0
	const avgTemp = water.reduce((sum, w) => sum + w.temperature, 0) / water.length || 28

	const forecastedPhRange = phForecast.length > 0
		? `${formatNumber(Math.min(...phForecast), { maximumFractionDigits: 1 })} - ${formatNumber(Math.max(...phForecast), { maximumFractionDigits: 1 })}`
		: '7.2 - 8.5'

	const maxRiskIndex = diseaseRisk.indexOf(Math.max(...diseaseRisk))
	const maxRiskDate = new Date()
	maxRiskDate.setDate(maxRiskDate.getDate() + maxRiskIndex * 5)

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: true, position: 'top' as const },
			tooltip: { mode: 'index' as const, intersect: false }
		},
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17, 24, 39, 0.08)' } }
		}
	}

	const growthChartOptions = {
		...chartOptions,
		scales: {
			...chartOptions.scales,
			y: {
				type: 'linear' as const,
				display: true,
				position: 'left' as const,
				title: { display: true, text: 'Weight (g)' },
				grid: { color: 'rgba(17, 24, 39, 0.08)' }
			},
			y1: {
				type: 'linear' as const,
				display: true,
				position: 'right' as const,
				title: { display: true, text: 'Δ month (g)' },
				grid: { drawOnChartArea: false }
			}
		}
	}

	return (
		<div className="dashGrid">
			{forecastsError && (
				<div className="panel spanAll" style={{ marginBottom: 16, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
					<div style={{ color: 'var(--bad)' }}>Warning: Could not load AI forecasts. Using calculated forecasts.</div>
				</div>
			)}

			{/* XGBoost harvest ML */}
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">ML harvest (XGBoost)</div>
					<div className="panelRight">
						{harvestMl.loading && <span className="muted" style={{ fontSize: '0.75rem' }}>Loading…</span>}
						{harvestMl.data && (
							<span className="muted" style={{ fontSize: '0.75rem', marginLeft: 8 }}>
								{harvestMl.data.source === 'xgboost' ? (
									<span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
										xgboost
									</span>
								) : (
									<span className="badge warn">unavailable</span>
								)}
								{harvestMl.data.source === 'xgboost' && harvestMl.data.input_source && harvestMl.data.input_source !== 'n/a'
									? ` · inputs: ${harvestMl.data.input_source}`
									: ''}
								{harvestMl.data.timestamp ? ` · ${formatDateTime(harvestMl.data.timestamp)}` : ''}
							</span>
						)}
					</div>
				</div>
				<div style={{ padding: 16 }}>
					{harvestMl.error && (
						<div className="muted" style={{ marginBottom: 12, color: 'var(--bad)' }}>
							{harvestMl.error}
						</div>
					)}
					{harvestMl.data?.source === 'unavailable' && (
						<div className="muted" style={{ marginBottom: 12 }}>
							{harvestMl.data.detail ?? 'Train artifacts with train_harvest_ml_models.py (outputs models/harvest_ml/).'}
						</div>
					)}
					{harvestMl.data?.source === 'xgboost' && !harvestMlActive && harvestMl.data.detail ? (
						<div className="muted" style={{ marginBottom: 12 }}>
							{harvestMl.data.detail}
						</div>
					) : null}
					{harvestMlActive && (
						<>
							<div style={{ overflowX: 'auto', marginBottom: 16 }}>
								<table className="dataTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
									<thead>
										<tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(17,24,39,0.08)' }}>
											<th style={{ padding: '8px 6px' }}>Pond</th>
											<th style={{ padding: '8px 6px' }}>Days to harvest</th>
											<th style={{ padding: '8px 6px' }}>Expected biomass (kg)</th>
											<th style={{ padding: '8px 6px' }}>Harvest window</th>
											<th style={{ padding: '8px 6px' }}>Early risk</th>
											<th style={{ padding: '8px 6px' }}>P(risk)</th>
										</tr>
									</thead>
									<tbody>
										{harvestMlRows.map((row) => (
											<tr key={row.pond_id} style={{ borderBottom: '1px solid rgba(17,24,39,0.06)' }}>
												<td style={{ padding: '8px 6px' }}>{row.pond_id}</td>
												<td style={{ padding: '8px 6px' }}>{row.available ? row.days_to_harvest ?? '—' : '—'}</td>
												<td style={{ padding: '8px 6px' }}>
													{row.available ? formatNumber(row.expected_biomass_kg ?? 0, { maximumFractionDigits: 2 }) : row.detail ?? '—'}
												</td>
												<td style={{ padding: '8px 6px' }}>
													{row.available && row.predicted_harvest_start && row.predicted_harvest_end
														? `${row.predicted_harvest_start} → ${row.predicted_harvest_end}`
														: '—'}
												</td>
												<td style={{ padding: '8px 6px' }}>
													{row.available ? (row.early_harvest?.risk ? 'Yes' : 'No') : '—'}
												</td>
												<td style={{ padding: '8px 6px' }}>
													{row.available
														? formatNumber((row.early_harvest?.probability ?? 0) * 100, { maximumFractionDigits: 1 }) + '%'
														: '—'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{mlRiskPonds.length > 0 && (
								<div
									style={{
										marginBottom: 16,
										padding: 12,
										borderRadius: 8,
										backgroundColor: 'rgba(245, 158, 11, 0.12)',
										border: '1px solid rgba(245, 158, 11, 0.35)'
									}}
								>
									<div style={{ fontWeight: 600, marginBottom: 8 }}>Early harvest alerts</div>
									<ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
										{mlRiskPonds.map((p) => (
											<li key={p.pond_id} className="muted" style={{ fontSize: '0.875rem' }}>
												Pond {p.pond_id}: probability{' '}
												{formatNumber((p.early_harvest?.probability ?? 0) * 100, { maximumFractionDigits: 1 })}%
												{p.early_harvest?.reason_codes?.length
													? ` — ${p.early_harvest.reason_codes.join(', ')}`
													: ''}
											</li>
										))}
									</ul>
								</div>
							)}
							{mlGrowthChart && (
								<div>
									<div style={{ fontWeight: 600, marginBottom: 8 }}>ML growth trajectory ({harvestMl.data?.horizon_days ?? 30}d horizon)</div>
									<div className="chartBoxLg" style={{ height: 220 }}>
										<Line data={mlGrowthChart as never} options={chartOptions} />
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Farm Summary Panel */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Farm Summary</div>
					{forecastsLoading && <div className="muted" style={{ fontSize: '0.75rem' }}>Loading AI forecasts...</div>}
				</div>
				<div style={{ padding: 16 }}>
					<div style={{ marginBottom: 20 }}>
						<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Current Shrimp Weight</div>
						<div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
							{formatNumber(currentWeight, { maximumFractionDigits: 1 })}g
						</div>
					</div>
					<div style={{ marginBottom: 20 }}>
						<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Estimated Harvest Yield</div>
						<div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
							{formatNumber(projectedYieldTons, { maximumFractionDigits: 1 })} Tons
						</div>
					</div>
					<div style={{ marginBottom: 20 }}>
						<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Projected Profit</div>
						<div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--good)' }}>
							{formatCurrencyLkr(projectedProfit)}
						</div>
					</div>
					<div>
						<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Next Harvest Window</div>
						<div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
							{harvestWindowStr} (FCR {formatNumber(fcr, { maximumFractionDigits: 1 })})
						</div>
					</div>
				</div>
			</div>

			{/* Shrimp Growth & Yield Forecast */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Shrimp Growth & Yield Forecast</div>
				</div>
				<div className="chartBoxLg" style={{ height: 250 }}>
					<Line data={growthChart as never} options={growthChartOptions as never} />
				</div>
				<div style={{ padding: 12, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: 8, marginTop: 12 }}>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Estimated Harvest Yield</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						{formatNumber(projectedYieldTons, { maximumFractionDigits: 1 })} Tons
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Forecasted Shrimp Weight</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						{formatNumber(forecastedWeight, { maximumFractionDigits: 1 })} g
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Recommendation</div>
					<div className="muted" style={{ fontSize: '0.875rem' }}>
						Adjust feed rates to accelerate growth and meet the ideal harvest size!
					</div>
				</div>
			</div>

			{/* Profit & Market Price Outlook */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Profit & Market Price Outlook</div>
				</div>
				<div className="chartBoxLg" style={{ height: 250 }}>
					<Line data={profitChart as never} options={chartOptions} />
				</div>
				<div style={{ padding: 12, backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: 8, marginTop: 12 }}>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Projected Profit</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						{formatCurrencyLkr(projectedProfit)}
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Market Price</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						{formatCurrencyLkr(shrimpPricePerKg, { maximumFractionDigits: 1 })}/kg
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Recommendation</div>
					<div className="muted" style={{ fontSize: '0.875rem' }}>
						Plan harvests to maximize revenue during high price periods!
					</div>
				</div>
			</div>

			{/* AI Predictions Summary */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">AI Predictions Summary</div>
				</div>
				<div style={{ padding: 16 }}>
					{aiPredictions.length > 0 ? (
						aiPredictions.map((prediction, i) => {
							const status = prediction.toLowerCase().includes('risk') || prediction.toLowerCase().includes('high') ? 'warning' : 'success'
							return (
								<div
									key={i}
									style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: 12,
										marginBottom: 16,
										padding: 12,
										backgroundColor: 'rgba(255, 255, 255, 0.5)',
										borderRadius: 8
									}}
								>
									<div
										style={{
											width: 20,
											height: 20,
											borderRadius: '50%',
											backgroundColor: status === 'success' ? 'var(--good)' : 'var(--info)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											color: 'white',
											fontSize: '12px',
											flexShrink: 0,
											marginTop: 2
										}}
									>
										✓
									</div>
									<div className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.5, flex: 1 }}>
										{prediction}
									</div>
								</div>
							)
						})
					) : (
						<div className="muted" style={{ fontSize: '0.875rem' }}>No AI predictions available</div>
					)}
				</div>
			</div>

			{/* Water Quality Predictions */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Water Quality Predictions</div>
				</div>
				<div className="chartBoxLg" style={{ height: 200 }}>
					<Line data={waterQualityChart as never} options={chartOptions} />
				</div>
				<div style={{ padding: 12, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, marginTop: 12 }}>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Forecasted pH Range</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						{forecastedPhRange}
					</div>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
						<div>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>Oxygen</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								{formatNumber(avgDO, { maximumFractionDigits: 1 })} mg/L{' '}
								<span style={{ color: avgDO < 5 ? 'var(--bad)' : 'var(--warn)' }}>({avgDO < 5 ? 'Low' : 'Normal'})</span>
							</div>
						</div>
						<div>
							<div style={{ fontWeight: 600, marginBottom: 4 }}>Temperature</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								{formatNumber(avgTemp, { maximumFractionDigits: 1 })} °C
							</div>
						</div>
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Recommendation</div>
					<div className="muted" style={{ fontSize: '0.875rem' }}>
						Increase aeration as temperatures rise to maintain oxygen levels!
					</div>
				</div>
			</div>

			{/* Disease & Environmental Risk */}
			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Disease & Environmental Risk</div>
				</div>
				<div className="chartBoxLg" style={{ height: 200 }}>
					<Line data={diseaseRiskChart as never} options={chartOptions} />
				</div>
				<div style={{ padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, marginTop: 12 }}>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Viral Infection Risk</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						High in mid-{maxRiskDate.toLocaleDateString('en-US', { month: 'long' })}
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Environmental Warning</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						Adding Aeration & Monitoring Virus Outbreaks
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Recommendation</div>
					<div className="muted" style={{ fontSize: '0.875rem' }}>
						Conduct more frequent health checks during high-risk periods!
					</div>
				</div>
			</div>

			{/* Bottom Metrics */}
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Forecast Summary</div>
					<div className="panelRight">
						<span className="muted">Updated {formatDateTime(dashboard.timestamp)}</span>
						{forecastsData && (
							<span className="muted" style={{ marginLeft: 8 }}>
								· AI Forecasts: {formatDateTime(forecastsData.timestamp)}
							</span>
						)}
					</div>
				</div>
				<div className="summaryStrip">
					<div className="summaryItem">
						<div className="muted">Estimated Harvest Yield</div>
						<div className="summaryValue mono">{formatNumber(projectedYieldTons, { maximumFractionDigits: 1 })} Tons</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Forecasted Weight</div>
						<div className="summaryValue mono">{formatNumber(forecastedWeight, { maximumFractionDigits: 1 })} g</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Projected Profit</div>
						<div className="summaryValue mono">{formatCurrencyLkr(projectedProfit)}</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Harvest Window</div>
						<div className="summaryValue mono">{harvestWindowStr}</div>
					</div>
				</div>
			</div>
		</div>
	)
}
