import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedingOptimizationResponse } from './types'
import type { WaterQualityData, FeedData } from './types'

type State = {
	data: FeedingOptimizationResponse | null
	loading: boolean
	/** True while revalidating but we already have data to show (stale-while-revalidate) */
	refreshing: boolean
	error: string | null
}

/** Pass dashboard response (or { water_quality, feed }) to use real data for recommendations. */
export type FeedingOptimizationDashboardInput = {
	water_quality: WaterQualityData[]
	feed: FeedData[]
	dashboard?: { timestamp?: string }
}

const CACHE_TTL_MS = 90_000

type CacheEntry = {
	key: string
	data: FeedingOptimizationResponse
	at: number
}

let feedingOptimizationCache: CacheEntry | null = null
/** Single in-flight fetch per cache key so two mounted consumers don't double POST */
const inFlight = new Map<string, Promise<FeedingOptimizationResponse>>()

function _isAbortError(e: unknown): boolean {
	if (e instanceof DOMException && e.name === 'AbortError') return true
	if (e instanceof Error && e.name === 'AbortError') return true
	const msg = e instanceof Error ? e.message : String(e)
	return /aborted/i.test(msg)
}

function buildCacheKey(
	ponds: number,
	dashboardData?: FeedingOptimizationDashboardInput | null
): string {
	const useRealData =
		dashboardData &&
		Array.isArray(dashboardData.water_quality) &&
		Array.isArray(dashboardData.feed) &&
		dashboardData.water_quality.length > 0 &&
		dashboardData.feed.length > 0
	if (useRealData) {
		const ts = dashboardData.dashboard?.timestamp ?? ''
		return `post:${ponds}:${dashboardData.water_quality.length}:${dashboardData.feed.length}:${ts}`
	}
	return `get:${ponds}`
}

export function useFeedingOptimization(
	ponds: number,
	dashboardData?: FeedingOptimizationDashboardInput | null
) {
	const cacheKey = buildCacheKey(ponds, dashboardData)
	const [state, setState] = useState<State>(() => {
		const cached = feedingOptimizationCache
		if (cached && cached.key === cacheKey && Date.now() - cached.at < CACHE_TTL_MS) {
			return {
				data: cached.data,
				loading: false,
				refreshing: false,
				error: null
			}
		}
		return { data: null, loading: false, refreshing: false, error: null }
	})
	const abortRef = useRef<AbortController | null>(null)
	const mountedRef = useRef(true)

	const load = useCallback(
		async (forceRefresh = false) => {
			const cached = feedingOptimizationCache
			const cacheValid =
				!forceRefresh &&
				cached &&
				cached.key === cacheKey &&
				Date.now() - cached.at < CACHE_TTL_MS

			if (cacheValid && cached) {
				setState((s) => ({
					...s,
					data: cached.data,
					loading: false,
					refreshing: false,
					error: null
				}))
				return
			}

			// Force refresh must not await a stale in-flight promise
			if (forceRefresh) {
				inFlight.delete(cacheKey)
			}

			// Abort only our own direct fetch — do not abort the shared inFlight fetch
			// or other awaiters get "signal is aborted without reason" as error.
			abortRef.current?.abort()
			const controller = new AbortController()
			abortRef.current = controller

			// Stale-while-revalidate: if we already have data, keep showing it and only mark refreshing
			setState((s) => {
				const hasData = s.data != null
				if (hasData) {
					return { ...s, refreshing: true, error: null }
				}
				return { ...s, loading: true, error: null }
			})

			try {
				const useRealData =
					dashboardData &&
					Array.isArray(dashboardData.water_quality) &&
					Array.isArray(dashboardData.feed) &&
					dashboardData.water_quality.length > 0 &&
					dashboardData.feed.length > 0

				let json: FeedingOptimizationResponse
				const existing = inFlight.get(cacheKey)
				if (existing) {
					json = await existing
				} else {
					// No signal on shared fetch: aborting one consumer must not reject others or
					// leave "signal is aborted without reason" in UI error state.
					const promise = (async () => {
						const res = useRealData
							? await fetch('/api/feeding-optimization', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({
										water_quality: dashboardData!.water_quality,
										feed: dashboardData!.feed
									})
								})
							: await fetch(
									`/api/feeding-optimization?ponds=${encodeURIComponent(String(ponds))}`
								)
						if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
						return (await res.json()) as FeedingOptimizationResponse
					})()
					inFlight.set(cacheKey, promise)
					try {
						json = await promise
					} finally {
						inFlight.delete(cacheKey)
					}
				}
				feedingOptimizationCache = { key: cacheKey, data: json, at: Date.now() }
				if (!mountedRef.current) return
				setState({ data: json, loading: false, refreshing: false, error: null })
			} catch (e) {
				// Aborted fetches are intentional (tab switch, strict mode double mount, new load) — not user errors
				if (controller.signal.aborted || _isAbortError(e)) {
					if (mountedRef.current) {
						setState((s) => ({
							...s,
							loading: false,
							refreshing: false
						}))
					}
					return
				}
				const message = e instanceof Error ? e.message : 'Failed to load feeding optimization'
				if (!mountedRef.current) return
				setState((s) => ({
					...s,
					loading: false,
					refreshing: false,
					error: s.data ? s.error : message
				}))
			}
		},
		[ponds, cacheKey, dashboardData]
	)

	const refresh = useCallback(async () => {
		await load(true)
	}, [load])

	useEffect(() => {
		mountedRef.current = true
		void load(false)
		return () => {
			mountedRef.current = false
			abortRef.current?.abort()
		}
	}, [load])

	return { ...state, refresh }
}
