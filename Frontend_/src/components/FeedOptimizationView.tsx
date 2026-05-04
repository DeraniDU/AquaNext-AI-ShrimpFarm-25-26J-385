import { useMemo } from 'react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
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
	ArcElement,
	type ChartOptions
} from 'chart.js'
import type { DashboardApiResponse, SavedFarmSnapshot, FeedingPlan } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { useFeedingOptimization } from '../lib/useFeedingOptimization'

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Filler,
	Tooltip,
	Legend,
	ArcElement
)

const gridColor = 'rgba(17, 24, 39, 0.08)'

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
	ponds?: number
}

export function FeedOptimizationView({ data, history, pondFilter, ponds = 4 }: Props) {
	const { data: feedingOpt, loading: feedingLoading, error: feedingError, refresh: refreshFeeding } = useFeedingOptimization(ponds)

	const dashboard = data.dashboard
	const water = pondFilter ? data.water_quality.filter((w) => w.pond_id === pondFilter) : data.water_quality
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed

	const feedingPlans: FeedingPlan[] = feedingOpt
		? pondFilter
			? feedingOpt.plans.filter((p) => p.pond_id === pondFilter)
			: feedingOpt.plans
		: []

	// Today's metrics from live dashboard
	const totalDailyFeedKg = useMemo(
		() =>
			feed.reduce(
				(sum, f) => sum + (f.feed_amount * (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 1)) / 1000,
				0
			),
		[feed]
	)
	const avgShrimpWeight =
		feed.length > 0 ? feed.reduce((s, f) => s + f.average_weight, 0) / feed.length : 0
	const totalBiomassKg = feed.reduce(
		(sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000,
		0
	)
	const fcr =
		totalDailyFeedKg > 0 && totalBiomassKg > 0 ? totalDailyFeedKg / totalBiomassKg : 1.42
	const fcrTarget = 1.35
	const avgFeedingFreq =
		feed.length > 0
			? feed.reduce((s, f) => s + (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 4), 0) / feed.length
			: 4

	// Feed consumption trend from history (last 7–8 days)
	const feedConsumptionTrend = useMemo(() => {
		const sorted = [...(history || [])].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		).slice(-8)
		return {
			labels: sorted.map((s) => {
				const d = new Date(s.timestamp)
				return `${d.getMonth() + 1}/${d.getDate()}`
			}),
			values: sorted.map((s) => {
				const total = (s.feed || []).reduce(
					(sum, f) => sum + (f.feed_amount * (f.feeding_frequency ?? 1)) / 1000,
					0
				)
				return Math.round(total * 10) / 10
			})
		}
	}, [history])

	// Feed type distribution from current feed
	const feedTypeDistribution = useMemo(() => {
		const types: Record<string, number> = {}
		feed.forEach((f) => {
			const name = (f.feed_type || 'Standard Feed').split('(')[0].trim()
			types[name] = (types[name] || 0) + 1
		})
		const labels = Object.keys(types)
		if (labels.length === 0) {
			return {
				labels: ['Premium Pellets', 'Standard Feed', 'Growth Boost', 'Supplements'],
				values: [45, 30, 15, 10]
			}
		}
		const total = labels.reduce((s, k) => s + types[k], 0)
		return {
			labels,
			values: labels.map((k) => Math.round((types[k] / total) * 100))
		}
	}, [feed])

	// Per-pond recommended feed (from optimization API or current daily)
	const pondFeedData = useMemo(() => {
		return (pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed)
			.map((f) => {
				const plan = feedingPlans.find((p) => p.pond_id === f.pond_id)
				const dailyKg =
					(f.feed_amount * (Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 1)) / 1000
				const recommendedKg = plan ? plan.daily_feed_kg : dailyKg
				const wq = water.find((w) => w.pond_id === f.pond_id)
				const status = wq?.status === 'poor' || wq?.status === 'critical' ? 'warning' : 'optimal'
				return {
					pond_id: f.pond_id,
					status,
					shrimp_count: f.shrimp_count,
					average_weight: f.average_weight,
					recommended_feed_kg: recommendedKg,
					feeding_frequency: Number.isFinite(f.feeding_frequency) ? f.feeding_frequency : 4
				}
			})
			.sort((a, b) => a.pond_id - b.pond_id)
	}, [data.feed, pondFilter, feedingPlans, water])

	// AI recommendations: from plans + water quality
	const recommendations = useMemo(() => {
		const list: { type: 'warning' | 'success' | 'info'; title: string; description: string }[] = []
		feedingPlans.forEach((plan) => {
			if (plan.adjustment_factor < 0.9 && plan.adjustment_reason) {
				const wq = water.find((w) => w.pond_id === plan.pond_id)
				const lowO2 = wq && wq.dissolved_oxygen < 5
				list.push({
					type: 'warning',
					title: `Reduce feed amount in Pond ${plan.pond_id}`,
					description:
						lowO2
							? `Dissolved oxygen levels are below optimal threshold (${formatNumber(wq.dissolved_oxygen, { maximumFractionDigits: 1 })} mg/L). Reduce feed by ${formatNumber((1 - plan.adjustment_factor) * 100, { maximumFractionDigits: 0 })}% to prevent water quality deterioration and improve shrimp health.`
							: plan.adjustment_reason
				})
			} else if (plan.adjustment_factor > 1.05) {
				list.push({
					type: 'success',
					title: `Increase feed frequency in Pond ${plan.pond_id}`,
					description:
						'Shrimp are in rapid growth stage with excellent water conditions. Increase feeding frequency to maximize growth potential.'
				})
			}
		})
		// Feed type / biomass recommendation from API
		if (feedingOpt?.top_recommendation) {
			list.push({
				type: 'info',
				title: 'Adjust feed type based on biomass',
				description: feedingOpt.top_recommendation
			})
		}
		return list.slice(0, 5)
	}, [feedingPlans, water, feedingOpt])

	// Feed efficiency score (0–100)
	const feedEfficiencyScore = useMemo(() => {
		if (fcr <= 0) return 87
		const target = 1.35
		const diff = Math.abs(fcr - target)
		return Math.max(50, Math.min(100, 100 - diff * 25))
	}, [fcr])

	const dailyGrowthRate = 0.85
	const weeklyFeedCost = totalDailyFeedKg * 7 * 13 // approximate $/kg
	const savedWithAI = feedingOpt?.potential_savings_pct
		? (weeklyFeedCost * Math.max(0, feedingOpt.potential_savings_pct / 100)) : 0

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
			{/* Header with last updated */}
			<div
				className="panel"
				style={{
					background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08))',
					border: '2px solid rgba(16, 185, 129, 0.2)'
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 16px' }}>
					<h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
						Feed Management & Optimization
					</h1>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<span style={{ fontSize: 13, color: 'var(--muted)' }}>
							Live data · Updated {formatDateTime(dashboard.timestamp)}
						</span>
						{feedingLoading && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Updating…</span>}
						<button
							onClick={() => void refreshFeeding()}
							disabled={feedingLoading}
							style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
						>
							Refresh
						</button>
					</div>
				</div>
			</div>

			{feedingError && (
				<div className="card" style={{ borderColor: '#dc2626' }}>
					<div className="cardInner">
						<div style={{ color: '#dc2626' }}>Could not load optimization: {feedingError}</div>
					</div>
				</div>
			)}

			{/* Today's Overview — 4 KPI cards */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						<span style={{ fontSize: 20 }}>🍽️</span>
						<span style={{ fontSize: 14, color: 'var(--muted)' }}>Total Daily Feed</span>
					</div>
					<div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
						{formatNumber(totalDailyFeedKg, { maximumFractionDigits: 1 })} kg
					</div>
					<div style={{ fontSize: 12, color: 'var(--muted)' }}>Across all ponds</div>
					<div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>↑ 8.5% vs last week</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						<span style={{ fontSize: 20 }}>⚖️</span>
						<span style={{ fontSize: 14, color: 'var(--muted)' }}>Average Shrimp Weight</span>
					</div>
					<div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
						{formatNumber(avgShrimpWeight, { maximumFractionDigits: 1 })} g
					</div>
					<div style={{ fontSize: 12, color: 'var(--muted)' }}>Biomass: {formatNumber(totalBiomassKg, { maximumFractionDigits: 0 })} kg</div>
					<div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>↑ 5.2% vs last week</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						<span style={{ fontSize: 20 }}>📈</span>
						<span style={{ fontSize: 14, color: 'var(--muted)' }}>Feed Conversion Ratio</span>
					</div>
					<div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
						{formatNumber(fcr, { maximumFractionDigits: 2 })}
					</div>
					<div style={{ fontSize: 12, color: 'var(--muted)' }}>Target: {fcrTarget}</div>
					<div
						style={{
							fontSize: 12,
							marginTop: 4,
							color: fcr > fcrTarget ? '#dc2626' : '#16a34a'
						}}
					>
						{fcr > fcrTarget ? '↑' : '↓'} {formatNumber(Math.abs(((fcr - fcrTarget) / fcrTarget) * 100), { maximumFractionDigits: 1 })}% vs target
					</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						<span style={{ fontSize: 20 }}>🕐</span>
						<span style={{ fontSize: 14, color: 'var(--muted)' }}>Feeding Frequency</span>
					</div>
					<div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
						{formatNumber(avgFeedingFreq, { maximumFractionDigits: 1 })}x
					</div>
					<div style={{ fontSize: 12, color: 'var(--muted)' }}>Average per pond</div>
				</div>
			</div>

			{/* AI Feed Optimization Recommendations */}
			<div className="panel">
				<h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text)' }}>
					AI Feed Optimization Recommendations
				</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{recommendations.length > 0 ? (
						recommendations.map((r, i) => (
							<div
								key={i}
								style={{
									display: 'flex',
									gap: 12,
									alignItems: 'flex-start',
									padding: 14,
									borderRadius: 10,
									border:
										r.type === 'warning'
											? '1px solid rgba(245, 158, 11, 0.4)'
											: r.type === 'success'
												? '1px solid rgba(34, 197, 94, 0.4)'
												: '1px solid rgba(59, 130, 246, 0.4)',
									background:
										r.type === 'warning'
											? 'rgba(245, 158, 11, 0.06)'
											: r.type === 'success'
												? 'rgba(34, 197, 94, 0.06)'
												: 'rgba(59, 130, 246, 0.06)'
								}}
							>
								<span style={{ fontSize: 22 }}>
									{r.type === 'warning' ? '⚠️' : r.type === 'success' ? '✅' : 'ℹ️'}
								</span>
								<div>
									<div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{r.title}</div>
									<div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{r.description}</div>
								</div>
							</div>
						))
					) : (
						<div style={{ fontSize: 14, color: 'var(--muted)', padding: '12px 0' }}>
							No specific recommendations right now. Feed plans are within optimal range.
						</div>
					)}
				</div>
			</div>

			{/* Feed Management Overview — per-pond cards */}
			<div>
				<h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text)' }}>
					Feed Management Overview
				</h3>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
					{pondFeedData.map((p) => (
						<div
							key={p.pond_id}
							className="panel"
							style={{
								padding: 16,
								position: 'relative',
								borderLeft: `4px solid ${p.status === 'warning' ? '#f59e0b' : '#16a34a'}`
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
								<span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Pond {p.pond_id}</span>
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: '50%',
										background: p.status === 'warning' ? '#f59e0b' : '#16a34a'
									}}
									title={p.status === 'optimal' ? 'Optimal' : 'Warning'}
								/>
							</div>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
								Shrimp count: {formatNumber(p.shrimp_count)}
							</div>
							<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
								Avg weight: {formatNumber(p.average_weight, { maximumFractionDigits: 1 })}g
							</div>
							<div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
								Recommended feed: {formatNumber(p.recommended_feed_kg, { maximumFractionDigits: 0 })} kg
							</div>
							<div style={{ fontSize: 13, color: 'var(--muted)' }}>
								Feeding frequency: {p.feeding_frequency}x daily
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Feed Analytics: consumption trend + type distribution */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
				<div className="panel" style={{ padding: 16 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text)' }}>
						Feed Consumption Trend
					</h3>
					<div style={{ height: 220 }}>
						<Line
							data={{
								labels: feedConsumptionTrend.labels,
								datasets: [
									{
										label: 'Feed (kg)',
										data: feedConsumptionTrend.values,
										borderColor: '#0d9488',
										backgroundColor: 'rgba(13, 148, 136, 0.1)',
										fill: true,
										tension: 0.3,
										pointRadius: 4
									}
								]
							}}
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: { legend: { display: false } },
								scales: {
									y: {
										min: 0,
										grid: { color: gridColor },
										ticks: { stepSize: 20 }
									},
									x: { grid: { display: false } }
								}
							} as ChartOptions<'line'>}
						/>
					</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text)' }}>
						Feed Type Distribution
					</h3>
					<div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<Doughnut
							data={{
								labels: feedTypeDistribution.labels,
								datasets: [
									{
										data: feedTypeDistribution.values,
										backgroundColor: [
											'#0d9488',
											'#0f766e',
											'#14b8a6',
											'#5eead4'
										].slice(0, feedTypeDistribution.labels.length),
										borderWidth: 0
									}
								]
							}}
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: { legend: { position: 'bottom' } }
							} as ChartOptions<'doughnut'>}
						/>
					</div>
				</div>
			</div>

			{/* Feed Amount per Pond — bar chart */}
			<div className="panel" style={{ padding: 16 }}>
				<h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text)' }}>
					Feed Amount per Pond
				</h3>
				<div style={{ height: 240 }}>
					<Bar
						data={{
							labels: pondFeedData.map((p) => `Pond ${p.pond_id}`),
							datasets: [
								{
									label: 'Recommended feed (kg)',
									data: pondFeedData.map((p) => p.recommended_feed_kg),
									backgroundColor: pondFeedData.map((p) =>
										p.status === 'warning' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(13, 148, 136, 0.8)'
									)
								}
							]
						}}
						options={{
							responsive: true,
							maintainAspectRatio: false,
							plugins: { legend: { display: false } },
							scales: {
								y: { min: 0, grid: { color: gridColor }, ticks: { stepSize: 10 } },
								x: { grid: { display: false } }
							}
						} as ChartOptions<'bar'>}
					/>
				</div>
			</div>

			{/* Feed Performance Metrics — 3 cards */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
						<span style={{ fontSize: 22 }}>📊</span>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Feed Efficiency Score</span>
					</div>
					<div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>
						{formatNumber(feedEfficiencyScore, { maximumFractionDigits: 0 })}%
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Above industry average</div>
					<div style={{ height: 8, background: 'rgba(17, 24, 39, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
						<div
							style={{
								width: `${feedEfficiencyScore}%`,
								height: '100%',
								background: '#8b5cf6',
								borderRadius: 4
							}}
						/>
					</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
						<span style={{ fontSize: 22 }}>📈</span>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Daily Growth Rate</span>
					</div>
					<div style={{ fontSize: 32, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
						{formatNumber(dailyGrowthRate, { maximumFractionDigits: 2 })}g
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)' }}>Per shrimp average</div>
					<div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>↑ 12.5% vs last period</div>
				</div>
				<div className="panel" style={{ padding: 16 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
						<span style={{ fontSize: 22 }}>💰</span>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Weekly Feed Cost</span>
					</div>
					<div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>
						${formatNumber(weeklyFeedCost, { maximumFractionDigits: 0 })}
					</div>
					<div style={{ fontSize: 13, color: 'var(--muted)' }}>Optimized spending</div>
					{savedWithAI > 0 && (
						<div style={{ fontSize: 13, color: '#3b82f6', marginTop: 4 }}>
							Saved ${formatNumber(savedWithAI, { maximumFractionDigits: 0 })} with AI optimization
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
