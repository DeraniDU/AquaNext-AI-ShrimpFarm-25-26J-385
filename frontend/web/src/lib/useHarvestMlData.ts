import { useState, useEffect, useCallback } from 'react'
import type { HarvestMlResponse } from './types'

type UseHarvestMlDataOptions = {
	ponds: number
	targetWeightG?: number
	horizonDays?: number
	seed?: number | null
	enabled?: boolean
	autoRefreshMs?: number | null
}

export function useHarvestMlData(options: UseHarvestMlDataOptions) {
	const {
		ponds,
		targetWeightG = 22,
		horizonDays = 30,
		seed = null,
		enabled = true,
		autoRefreshMs = null
	} = options

	const [data, setData] = useState<HarvestMlResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

	const fetchHarvestMl = useCallback(async () => {
		if (!enabled || ponds < 1) {
			return
		}
		setLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams({
				ponds: String(ponds),
				target_weight_g: String(targetWeightG),
				horizon_days: String(horizonDays)
			})
			if (seed != null) {
				params.set('seed', String(seed))
			}

			const response = await fetch(`/api/harvest-ml?${params}`)
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const json = (await response.json()) as HarvestMlResponse
			setData(json)
			setLastUpdatedAt(new Date())
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			setError(message)
			console.error('Failed to fetch harvest ML:', err)
		} finally {
			setLoading(false)
		}
	}, [enabled, ponds, targetWeightG, horizonDays, seed])

	useEffect(() => {
		void fetchHarvestMl()
	}, [fetchHarvestMl])

	useEffect(() => {
		if (autoRefreshMs && autoRefreshMs > 0 && enabled) {
			const interval = setInterval(() => {
				void fetchHarvestMl()
			}, autoRefreshMs)
			return () => clearInterval(interval)
		}
	}, [autoRefreshMs, enabled, fetchHarvestMl])

	return {
		data,
		loading,
		error,
		lastUpdatedAt,
		refresh: fetchHarvestMl
	}
}
