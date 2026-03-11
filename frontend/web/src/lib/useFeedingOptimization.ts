import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedingOptimizationResponse } from './types'
import type { WaterQualityData, FeedData } from './types'

type State = {
	data: FeedingOptimizationResponse | null
	loading: boolean
	error: string | null
}

/** Pass dashboard response (or { water_quality, feed }) to use real data for recommendations. */
export type FeedingOptimizationDashboardInput = {
	water_quality: WaterQualityData[]
	feed: FeedData[]
}

export function useFeedingOptimization(
	ponds: number,
	dashboardData?: FeedingOptimizationDashboardInput | null
) {
	const [state, setState] = useState<State>({ data: null, loading: false, error: null })
	const abortRef = useRef<AbortController | null>(null)

	const load = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState((s) => ({ ...s, loading: true, error: null }))
		try {
			const useRealData =
				dashboardData &&
				Array.isArray(dashboardData.water_quality) &&
				Array.isArray(dashboardData.feed) &&
				dashboardData.water_quality.length > 0 &&
				dashboardData.feed.length > 0

			const res = useRealData
				? await fetch('/api/feeding-optimization', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							water_quality: dashboardData.water_quality,
							feed: dashboardData.feed
						}),
						signal: controller.signal
					})
				: await fetch(`/api/feeding-optimization?ponds=${encodeURIComponent(String(ponds))}`, {
						signal: controller.signal
					})

			if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
			const json = (await res.json()) as FeedingOptimizationResponse
			setState({ data: json, loading: false, error: null })
		} catch (e) {
			if (controller.signal.aborted) return
			const message = e instanceof Error ? e.message : 'Failed to load feeding optimization'
			setState((s) => ({ ...s, loading: false, error: message }))
		}
		}, [ponds, dashboardData?.water_quality, dashboardData?.feed])

	const refresh = useCallback(async () => {
		await load()
	}, [load])

	useEffect(() => {
		void load()
		return () => abortRef.current?.abort()
	}, [load])

	return { ...state, refresh }
}
