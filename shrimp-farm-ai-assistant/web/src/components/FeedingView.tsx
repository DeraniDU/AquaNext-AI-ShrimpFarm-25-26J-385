import { Bar, Line } from 'react-chartjs-2'
import type { DashboardApiResponse, SavedFarmSnapshot } from '../lib/types'
import { formatNumber, formatDateTime } from '../lib/format'

type Props = {
	data: DashboardApiResponse
	history: SavedFarmSnapshot[]
	pondFilter: number | null
}

export function FeedingView({ data, history, pondFilter }: Props) {
	const { dashboard } = data
	const feed = pondFilter ? data.feed.filter((f) => f.pond_id === pondFilter) : data.feed

	const historyFiltered = history.map((snap) => ({
		...snap,
		feed: pondFilter ? snap.feed.filter((f) => f.pond_id === pondFilter) : snap.feed
	}))

	const historyLabels = historyFiltered.map((h) => {
		const d = new Date(h.timestamp)
		return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
	})

	const historyTotalFeedKg = historyFiltered.map((h) => {
		const total = h.feed.reduce((sum, f) => sum + f.feed_amount, 0)
		return total / 1000
	})

	const historyAvgWeight = historyFiltered.map((h) => {
		const weights = h.feed.map((f) => f.average_weight)
		return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
	})

	const totalFeedG = feed.reduce((sum, f) => sum + f.feed_amount, 0)
	const totalFeedKg = totalFeedG / 1000
	const totalBiomassKg = feed.reduce((sum, f) => sum + (f.shrimp_count * f.average_weight) / 1000, 0)
	const feedRate = totalBiomassKg > 0 ? (totalFeedKg / totalBiomassKg) * 100 : 0

	const feedByPond = feed.map((f) => ({
		pond: f.pond_id,
		amount: f.feed_amount / 1000,
		type: f.feed_type,
		frequency: f.feeding_frequency,
		nextFeeding: f.predicted_next_feeding
	}))

	const feedChart = {
		labels: historyLabels,
		datasets: [
			{
				label: 'Daily Feed (kg)',
				data: historyTotalFeedKg,
				backgroundColor: 'rgba(59, 130, 246, 0.85)',
				borderRadius: 6,
				maxBarThickness: 18
			}
		]
	}

	const weightChart = {
		labels: historyLabels,
		datasets: [
			{
				label: 'Avg. Weight (g)',
				data: historyAvgWeight,
				borderColor: '#2563eb',
				backgroundColor: 'rgba(37, 99, 235, 0.1)',
				fill: true,
				tension: 0.35
			}
		]
	}

	const pondFeedChart = {
		labels: feedByPond.map((f) => `Pond ${f.pond}`),
		datasets: [
			{
				label: 'Feed Amount (kg)',
				data: feedByPond.map((f) => f.amount),
				backgroundColor: 'rgba(34, 197, 94, 0.75)',
				borderRadius: 6
			}
		]
	}

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false }
		},
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: 'rgba(17, 24, 39, 0.08)' }, title: { display: true, text: 'Feed (kg)' } }
		}
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
					<div className="panelTitle">Feeding Overview</div>
					<div className="panelRight">
						<span className="muted">Updated {formatDateTime(dashboard.timestamp)}</span>
					</div>
				</div>
				<div className="summaryStrip" style={{ marginBottom: 20 }}>
					<div className="summaryItem">
						<div className="muted">Total Daily Feed</div>
						<div className="summaryValue mono">{formatNumber(totalFeedKg, { maximumFractionDigits: 1 })} kg</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Total Biomass</div>
						<div className="summaryValue mono">{formatNumber(totalBiomassKg, { maximumFractionDigits: 1 })} kg</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Feed Rate</div>
						<div className="summaryValue mono">{formatNumber(feedRate, { maximumFractionDigits: 2 })}%</div>
					</div>
					<div className="summaryItem">
						<div className="muted">Feed Efficiency</div>
						<div className="summaryValue mono">{formatNumber(dashboard.feed_efficiency * 100, { maximumFractionDigits: 0 })}%</div>
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
					<div className="panelTitle">Shrimp Weight Trend</div>
				</div>
				<div className="chartBoxLg" style={{ height: 300 }}>
					<Line data={weightChart as never} options={lineOptions} />
				</div>
			</div>

			<div className="panel">
				<div className="panelHeader">
					<div className="panelTitle">Feed by Pond</div>
				</div>
				<div className="chartBoxLg" style={{ height: 250 }}>
					<Bar data={pondFeedChart} options={barOptions} />
				</div>
			</div>

			<div className="panel spanAll">
				<div className="panelHeader">
					<div className="panelTitle">Feeding Schedule</div>
				</div>
				<div style={{ padding: 16 }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
						{feedByPond.map((f) => (
							<div
								key={f.pond}
								style={{
									padding: 16,
									backgroundColor: 'rgba(255, 255, 255, 0.5)',
									borderLeft: '4px solid rgba(34, 197, 94, 0.6)',
									borderRadius: 8
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: 8 }}>Pond {f.pond}</div>
								<div className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
									<div>
										<strong>Feed Amount:</strong> {formatNumber(f.amount, { maximumFractionDigits: 1 })} kg
									</div>
									<div>
										<strong>Feed Type:</strong> {f.type}
									</div>
									<div>
										<strong>Frequency:</strong> {f.frequency}x per day
									</div>
									<div>
										<strong>Next Feeding:</strong>{' '}
										{f.nextFeeding ? new Date(f.nextFeeding).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

