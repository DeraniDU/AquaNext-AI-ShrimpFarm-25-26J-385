import { useCallback, useEffect, useState } from 'react'

export type SystemAnalyticsResponse = {
	type: string
	totalBatches: number
	batches: Array<{
		batchId: string
		batchName: string
		totalFeedKg: number
		totalBiomassKg: number
		averageABW: number
		totalCycles: number
	}>
	summary: {
		totalFeedKg: number
		totalBiomassKg: number
		averageABW: number
		averageFCR: number
		totalCycles: number
	}
	comparisonData: {
		abwByWeek: Array<{ week: number; week_label: string; abw_g: number }>
		biomassByWeek: Array<{ week: number; week_label: string; biomass_kg: number }>
		fcrTrends: Array<{ week: number; week_label: string; fcr: number }>
	}
	cycleFeedData: Array<{
		cycle: number
		date: string
		dispensed: number
		consumed: number
		wasted: number
		batches_count: number
	}>
	feedSummary: {
		totalDispensed: number
		totalConsumed: number
		totalWasted: number
		wastePercentage: number
	}
}

export function useFeedingSystemAnalytics() {
	const [data, setData] = useState<SystemAnalyticsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/feeding-system/analytics/system', { cache: 'no-store' })
			if (!res.ok) throw new Error(`API ${res.status}`)
			const json = await res.json() as SystemAnalyticsResponse
			setData(json)
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to load feeding analytics'
			setError(message)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	return { data, loading, error, refresh: fetchData }
}
