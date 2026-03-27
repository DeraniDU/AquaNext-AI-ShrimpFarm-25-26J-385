import { Line, Bar } from 'react-chartjs-2'
import { useState, useEffect } from 'react'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { useForecastsData } from '../lib/useForecastsData'

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function ForecastingView({ data, history, pondFilter }: Props) {
	const { dashboard } = data
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const energy = pondFilter ? data.energy.filter((e) => e.pond_id === pondFilter) : data.energy

	// Fetch AI-generated forecasts
	const { data: forecastsData, loading: forecastsLoading, error: forecastsError } = useForecastsData({
		ponds: pondFilter ? 1 : data.water_quality.length,
		forecastDays: 90
	})

	// Calculate current metrics from real-time data
	const currentWeight = feed.length > 0 ? feed.reduce((sum, f) => sum + f.average_weight, 0) / feed.length : 10
	const totalBiomassKg = feed.reduce((sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000, 0)
	const estimatedHarvestYieldTons = totalBiomassKg / 1000

	// Price constants (LKR)
	const shrimpPricePerKg = 2000
	const feedCostPerKg = 400
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
	const forecastedWeight = growthForecast.length > 0 ? growthForecast[growthForecast.length - 1].avg_weight_g || currentWeight : currentWeight
	const projectedYieldTons = harvestWindow?.projected_yield_tons || estimatedHarvestYieldTons

	// Generate monthly labels for charts
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	const currentMonth = new Date().getMonth()
	const chartMonths = months.slice(Math.max(0, currentMonth - 6), currentMonth + 1)
	const forecastMonths = months.slice(currentMonth + 1, Math.min(12, currentMonth + 7))

	// Growth chart - combine historical with AI forecast
	const historyFiltered = history.map((snap) => ({
		...snap,
		feed: pondFilter ? snap.feed.filter((f) => f.pond_id === pondFilter) : snap.feed
	}))
	const historyAvgWeight = historyFiltered.map((h) => {
		const weights = h.feed.map((f) => f.average_weight)
		return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
	})

	// Map AI forecast to monthly data
	const monthlyGrowthForecast = forecastMonths.map((_, i) => {
		const dayIndex = Math.floor((i + 1) * 30)
		if (dayIndex < growthForecast.length) {
			return growthForecast[dayIndex].avg_weight_g || currentWeight
		}
		return currentWeight
	})

	const growthChart = {
		labels: [...chartMonths, ...forecastMonths],
		datasets: [
			{
				type: 'line' as const,
				label: 'Historical',
				data: [...historyAvgWeight.slice(-chartMonths.length), ...Array(forecastMonths.length).fill(null)],
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.1)',
				fill: true,
				tension: 0.4
			},
			{
				type: 'bar' as const,
				label: 'Monthly Growth',
				data: [
					...historyAvgWeight.slice(-chartMonths.length).map((w, i) => i > 0 ? w - historyAvgWeight[historyAvgWeight.length - chartMonths.length + i - 1] : 0),
					...Array(forecastMonths.length).fill(null)
				],
				backgroundColor: 'rgba(59, 130, 246, 0.6)',
				borderRadius: 4
			},
			{
				type: 'line' as const,
				label: 'AI Forecast',
				data: [...Array(chartMonths.length).fill(null), ...monthlyGrowthForecast],
				borderColor: '#16a34a',
				backgroundColor: 'rgba(22, 163, 74, 0.1)',
				fill: true,
				borderDash: [5, 5],
				tension: 0.4
			},
			{
				type: 'bar' as const,
				label: 'AI Forecast Growth',
				data: [
					...Array(chartMonths.length).fill(null),
					...monthlyGrowthForecast.map((w, i) => i > 0 ? w - monthlyGrowthForecast[i - 1] : w - currentWeight)
				],
				backgroundColor: 'rgba(34, 197, 94, 0.4)',
				borderRadius: 4
			}
		]
	}

	// Profit chart from AI forecast
	const monthlyProfitForecast = forecastMonths.map((_, i) => {
		const dayIndex = Math.floor((i + 1) * 30)
		if (dayIndex < profitForecast.length) {
			return profitForecast[dayIndex].profit_lkr || 0
		}
		return 0
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

	const profitChart = {
		labels: [...chartMonths, ...forecastMonths],
		datasets: [
			{
				type: 'line' as const,
				label: 'Historical',
				data: [...profitHistorical, ...Array(forecastMonths.length).fill(null)],
				borderColor: '#16a34a',
				backgroundColor: 'rgba(22, 163, 74, 0.1)',
				fill: true,
				tension: 0.4
			},
			{
				type: 'bar' as const,
				label: 'Monthly Profit',
				data: [...profitHistorical, ...Array(forecastMonths.length).fill(null)],
				backgroundColor: 'rgba(34, 197, 94, 0.6)',
				borderRadius: 4
			},
			{
				type: 'line' as const,
				label: 'AI Forecast',
				data: [...Array(chartMonths.length).fill(null), ...monthlyProfitForecast],
				borderColor: '#f59e0b',
				backgroundColor: 'rgba(245, 158, 11, 0.1)',
				fill: true,
				borderDash: [5, 5],
				tension: 0.4
			},
			{
				type: 'bar' as const,
				label: 'Forecast Profit',
				data: [...Array(chartMonths.length).fill(null), ...monthlyProfitForecast],
				backgroundColor: 'rgba(245, 158, 11, 0.4)',
				borderRadius: 4
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
				label: 'Risk Level',
				data: diseaseRisk,
				backgroundColor: diseaseRisk.map((r) => (r > 60 ? 'rgba(239, 68, 68, 0.7)' : r > 40 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(34, 197, 94, 0.7)')),
				borderRadius: 4
			},
			{
				type: 'line' as const,
				label: 'Forecast',
				data: diseaseRisk,
				borderColor: '#f59e0b',
				borderDash: [5, 5],
				fill: false,
				tension: 0.4
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

	return (
		<div className="dashGrid">
			{forecastsError && (
				<div className="panel spanAll" style={{ marginBottom: 16, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
					<div style={{ color: 'var(--bad)' }}>Warning: Could not load AI forecasts. Using calculated forecasts.</div>
				</div>
			)}

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
							Rs. {formatNumber(projectedProfit, { maximumFractionDigits: 0 })}
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
					<Line data={growthChart as never} options={chartOptions} />
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
						Rs. {formatNumber(projectedProfit, { maximumFractionDigits: 0 })}
					</div>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>Market Price</div>
					<div className="muted" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
						Rs. {formatNumber(shrimpPricePerKg, { maximumFractionDigits: 1 })}/kg
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
					<Bar data={diseaseRiskChart as never} options={chartOptions} />
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
						<div className="summaryValue mono">Rs. {formatNumber(projectedProfit, { maximumFractionDigits: 0 })}</div>
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
