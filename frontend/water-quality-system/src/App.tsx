import { WaterQualityView } from './components/WaterQualityView'
import type { DashboardApiResponse } from './lib/types'
import { useDashboardData } from './lib/useDashboardData'
import { useHistoryData } from './lib/useHistoryData'

export default function App() {
	const ponds = 4
	const { data, loading, error } = useDashboardData({
		ponds,
		autoRefreshMs: 15_000
	})
	const { data: historyData } = useHistoryData({ days: 7 })

	if (loading && !data) {
		return (
			<div className="emptyState" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				Loading water quality…
			</div>
		)
	}
	if (error && !data) {
		return (
			<div className="emptyState" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bad)' }}>
				{error}
			</div>
		)
	}
	if (!data) return null

	const viewProps = {
		data: data as DashboardApiResponse,
		history: historyData?.items ?? [],
		pondFilter: null as number | null
	}

	return (
		<div style={{ width: '100%', minHeight: '100vh', padding: 20 }}>
			<WaterQualityView {...viewProps} />
		</div>
	)
}
