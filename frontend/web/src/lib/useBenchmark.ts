import { useState, useEffect } from 'react'
import type { BenchmarkApiResponse } from './types'

type UseBenchmarkOptions = {
	ponds?: number
	seed?: number | null
	autoRefreshMs?: number | null
	includeAi?: boolean
	timeoutMs?: number
}

export function useBenchmark(options: UseBenchmarkOptions = {}) {
	const { ponds = 4, seed = null, autoRefreshMs = null, includeAi = false, timeoutMs = 70000 } = options
	const [data, setData] = useState<BenchmarkApiResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

	const fetchBenchmark = async () => {
		setLoading(true)
		setError(null)
		const controller = new AbortController()
		const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

		try {
			const params = new URLSearchParams({
				ponds: String(ponds),
				include_ai: String(includeAi),
			})
			if (seed != null) params.set('seed', String(seed))

			const response = await fetch(`/api/benchmark?${params}`, { signal: controller.signal })
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const json = (await response.json()) as BenchmarkApiResponse
			setData(json)
			setLastUpdatedAt(new Date())
		} catch (err) {
			const message =
				err instanceof DOMException && err.name === 'AbortError'
					? 'Benchmark request timed out. Check that the backend API is running and try again.'
					: err instanceof Error
						? err.message
						: String(err)
			setError(message)
			console.error('Failed to fetch benchmark:', err)
		} finally {
			window.clearTimeout(timeoutId)
			setLoading(false)
		}
	}

	useEffect(() => {
		void fetchBenchmark()
	}, [ponds, seed, includeAi, timeoutMs])

	useEffect(() => {
		if (autoRefreshMs && autoRefreshMs > 0) {
			const interval = setInterval(() => {
				void fetchBenchmark()
			}, autoRefreshMs)
			return () => clearInterval(interval)
		}
	}, [autoRefreshMs, ponds, seed, includeAi, timeoutMs])

	return {
		data,
		loading,
		error,
		lastUpdatedAt,
		refresh: fetchBenchmark,
	}
}
