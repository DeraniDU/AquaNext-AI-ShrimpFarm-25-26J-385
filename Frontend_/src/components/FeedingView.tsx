import { Bar, Line } from 'react-chartjs-2'
import type { SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'
import { useFeedingSystemBatches } from '../lib/useFeedingSystemBatches'
import { useFeedingSystemAnalytics } from '../lib/useFeedingSystemAnalytics'

type Props = {
	ponds: number
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function FeedingView({ ponds, history, pondFilter }: Props) {
	const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useFeedingSystemAnalytics()
	const { data: feedingSystemData, loading: feedingSystemLoading, error: feedingSystemError, refresh: refreshFeedingSystem } = useFeedingSystemBatches()

	if ((analyticsLoading && !analyticsData) || (feedingSystemLoading && !feedingSystemData.batches.length)) {
		return <div className="emptyState">Loading feeding system data...</div>
	}
	if (analyticsError) return <div className="emptyState">Error: {analyticsError}</div>
	if (!analyticsData) return null

	const { summary, comparisonData, cycleFeedData, feedSummary } = analyticsData

	// Map cycle data for Feed Consumption History
	const feedChartLabels = cycleFeedData.map(c => {
		const d = new Date(c.date)
		return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
	})
	
	const feedChart = {
		labels: feedChartLabels,
		datasets: [
			{
				label: 'Dispensed (kg)',
				data: cycleFeedData.map(c => c.dispensed),
				backgroundColor: 'rgba(59, 130, 246, 0.85)',
				borderRadius: 6,
				maxBarThickness: 18
			},
			{
				label: 'Consumed (kg)',
				data: cycleFeedData.map(c => c.consumed),
				backgroundColor: 'rgba(34, 197, 94, 0.85)',
				borderRadius: 6,
				maxBarThickness: 18
			}
		]
	}

	// Map ABW data for Weight Trend
	const weightChartLabels = comparisonData.abwByWeek.map(w => w.week_label)
	const weightChart = {
		labels: weightChartLabels,
		datasets: [
			{
				label: 'Avg. Weight (g)',
				data: comparisonData.abwByWeek.map(w => w.abw_g),
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.1)',
				fill: true,
				tension: 0.35
			}
		]
	}

	// Filter batches based on pondFilter if any
	const batches = feedingSystemData.batches
	
	const pondFeedChart = {
		labels: batches.map(b => b.batchName),
		datasets: [
			{
				label: 'Total Feed (kg)',
				data: batches.map(b => b.feedAmount || 0),
				backgroundColor: 'rgba(34, 197, 94, 0.75)',
				borderRadius: 6
			}
		]
	}

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: true }
		},
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17, 24, 39, 0.08)' }, title: { display: true, text: 'Feed (kg)' } }
		}
	}

	const pondBarOptions = {
		...barOptions,
		plugins: { legend: { display: false } }
	}

	const lineOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false }
		},
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17, 24, 39, 0.08)' }, title: { display: true, text: 'Weight (g)' } }
		}
	}

	return (
		<div className="dashGrid">
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Feeding Overview (System Aggregated)</div>
				</div>
				<div className="summaryStrip" style={{ marginBottom: 20 }}>
					<div className="summaryItem">
						<div className="muted">Total Feed Dispensed</div>
						<div className="summaryValue mono">{formatNumber(feedSummary.totalDispensed, { maximumFractionDigits: 1 })} kg</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Total Estimated Biomass</div>
						<div className="summaryValue mono">{formatNumber(summary.totalBiomassKg, { maximumFractionDigits: 1 })} kg</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Est. Wasted Feed</div>
						<div className="summaryValue mono" style={{ color: feedSummary.wastePercentage > 10 ? 'var(--color-danger, #dc2626)' : 'inherit' }}>
							{formatNumber(feedSummary.totalWasted, { maximumFractionDigits: 1 })} kg ({formatNumber(feedSummary.wastePercentage, { maximumFractionDigits: 1 })}%)
						</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Average ABW</div>
						<div className="summaryValue mono">{formatNumber(summary.averageABW, { maximumFractionDigits: 2 })} g</div>
					</div>
				</div>
			</div>

			{/* Feeding System (batches & motor via API gateway) */}
			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Feeding System Batches (Backend)</div>
					<div className="panelRight">
						<button type="button" onClick={refreshFeedingSystem} disabled={feedingSystemLoading}>
							{feedingSystemLoading ? 'Loading…' : 'Refresh'}
						</button>
					</div>
				</div>
				<div style={{ padding: 16 }}>
					{feedingSystemError && (
						<div style={{ color: 'var(--color-danger, #dc2626)', marginBottom: 12 }}>
							{feedingSystemError}
						</div>
					)}
					{feedingSystemData.motorStatus != null && (
						<div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(17, 24, 39, 0.05)', borderRadius: 8 }}>
							<div style={{ fontWeight: 600, marginBottom: 8 }}>Motor Status</div>
							<div className="muted" style={{ fontSize: '0.875rem' }}>
								State: {feedingSystemData.motorStatus.state ?? '—'}
								{feedingSystemData.motorStatus.motor_speed != null && (
									<> · Speed: {(feedingSystemData.motorStatus.motor_speed * 100).toFixed(0)}%</>
								)}
							</div>
						</div>
					)}
					<div style={{ fontWeight: 600, marginBottom: 8 }}>Batches ({feedingSystemData.batches.length})</div>
					{feedingSystemData.batches.length === 0 && !feedingSystemLoading && (
						<div className="muted">No batches from feeding system. Start the feeding-system backend and API gateway.</div>
					)}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
						{feedingSystemData.batches.map((b) => (
							<div
								key={b.id}
								style={{
									padding: 14,
									backgroundColor: 'rgba(255, 255, 255, 0.6)',
									borderLeft: `4px solid ${b.status === 'active' ? 'rgba(34, 197, 94, 0.8)' : b.status === 'completed' ? 'rgba(107, 114, 128, 0.6)' : 'rgba(59, 130, 246, 0.6)'}`,
									borderRadius: 8
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: 6 }}>{b.batchName}</div>
								<div className="muted" style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
									<div>Status: {b.status}</div>
									<div>Species: {b.species}</div>
									<div>Pond: {b.pondSize} {b.pondSizeUnit}</div>
									{b.daysPassed != null && <div>Days: {b.daysPassed}</div>}
									{b.feedAmount != null && b.feedAmount > 0 && <div>Total Feed: {formatNumber(b.feedAmount, { maximumFractionDigits: 1 })} kg</div>}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Feed Consumption History</div>
				</div>
				<div className="chartBoxLg" style={{ height: 300 }}>
					<Bar data={feedChart} options={barOptions} />
				</div>
			</div>

			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Shrimp Weight Trend (System Avg)</div>
				</div>
				<div className="chartBoxLg" style={{ height: 300 }}>
					<Line data={weightChart as never} options={lineOptions} />
				</div>
			</div>

			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Total Feed by Batch</div>
				</div>
				<div className="chartBoxLg" style={{ height: 250 }}>
					<Bar data={pondFeedChart} options={pondBarOptions} />
				</div>
			</div>
		</div>
	)
}
